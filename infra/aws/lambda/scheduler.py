"""
Weekend scheduler Lambda for walking-dog dev environment.

Actions:
  - start: Start RDS, create ALB + TG + Listener, create ECS Service
  - stop:  Delete ECS Service, delete ALB + TG + Listener, stop RDS
"""

import json
import os
import time

import boto3

rds = boto3.client("rds")
ecs = boto3.client("ecs")
elbv2 = boto3.client("elbv2")

# Environment variables (set by Terraform)
DB_INSTANCE_ID = os.environ["DB_INSTANCE_ID"]
ECS_CLUSTER = os.environ["ECS_CLUSTER"]
ECS_SERVICE_NAME = os.environ["ECS_SERVICE_NAME"]
TASK_DEFINITION = os.environ["TASK_DEFINITION"]
SUBNET_IDS = json.loads(os.environ["SUBNET_IDS"])
ALB_SG_ID = os.environ["ALB_SG_ID"]
ECS_SG_ID = os.environ["ECS_SG_ID"]
VPC_ID = os.environ["VPC_ID"]
PROJECT_NAME = os.environ["PROJECT_NAME"]
ENVIRONMENT = os.environ["ENVIRONMENT"]


def handler(event, context):
    action = event.get("action", "")
    print(f"Scheduler action: {action}")

    if action == "start":
        start_environment()
    elif action == "stop":
        stop_environment()
    else:
        raise ValueError(f"Unknown action: {action}")

    return {"statusCode": 200, "body": f"Action '{action}' completed"}


def start_environment():
    # 1. Start RDS
    print("Starting RDS instance...")
    try:
        rds.start_db_instance(DBInstanceIdentifier=DB_INSTANCE_ID)
        print("RDS start initiated")
    except rds.exceptions.InvalidDBInstanceStateFault:
        print("RDS is already running or starting")

    # 2. Wait for RDS to be available
    print("Waiting for RDS to be available...")
    waiter = rds.get_waiter("db_instance_available")
    waiter.wait(
        DBInstanceIdentifier=DB_INSTANCE_ID,
        WaiterConfig={"Delay": 30, "MaxAttempts": 20},
    )
    print("RDS is available")

    # 3. Create ALB
    print("Creating ALB...")
    alb_name = f"{PROJECT_NAME}-{ENVIRONMENT}"
    alb_response = elbv2.create_load_balancer(
        Name=alb_name,
        Subnets=SUBNET_IDS,
        SecurityGroups=[ALB_SG_ID],
        Scheme="internet-facing",
        Type="application",
        Tags=[
            {"Key": "Environment", "Value": ENVIRONMENT},
            {"Key": "Project", "Value": PROJECT_NAME},
            {"Key": "ManagedBy", "Value": "scheduler-lambda"},
        ],
    )
    alb_arn = alb_response["LoadBalancers"][0]["LoadBalancerArn"]
    print(f"ALB created: {alb_arn}")

    # 4. Create Target Group
    print("Creating Target Group...")
    tg_response = elbv2.create_target_group(
        Name=f"{PROJECT_NAME}-{ENVIRONMENT}-api",
        Protocol="HTTP",
        Port=3000,
        VpcId=VPC_ID,
        TargetType="ip",
        HealthCheckProtocol="HTTP",
        HealthCheckPath="/health",
        HealthCheckIntervalSeconds=30,
        HealthyThresholdCount=2,
        UnhealthyThresholdCount=3,
        Tags=[
            {"Key": "Environment", "Value": ENVIRONMENT},
            {"Key": "ManagedBy", "Value": "scheduler-lambda"},
        ],
    )
    tg_arn = tg_response["TargetGroups"][0]["TargetGroupArn"]
    print(f"Target Group created: {tg_arn}")

    # 5. Wait for ALB to be active
    print("Waiting for ALB to be active...")
    waiter = elbv2.get_waiter("load_balancer_available")
    waiter.wait(LoadBalancerArns=[alb_arn])

    # 6. Create Listener
    print("Creating Listener...")
    elbv2.create_listener(
        LoadBalancerArn=alb_arn,
        Protocol="HTTP",
        Port=80,
        DefaultActions=[{"Type": "forward", "TargetGroupArn": tg_arn}],
    )
    print("Listener created")

    # 7. Create ECS Service
    print("Creating ECS Service...")
    try:
        ecs.create_service(
            cluster=ECS_CLUSTER,
            serviceName=ECS_SERVICE_NAME,
            taskDefinition=TASK_DEFINITION,
            desiredCount=1,
            launchType="FARGATE",
            networkConfiguration={
                "awsvpcConfiguration": {
                    "subnets": SUBNET_IDS,
                    "securityGroups": [ECS_SG_ID],
                    "assignPublicIp": "ENABLED",
                }
            },
            loadBalancers=[
                {
                    "targetGroupArn": tg_arn,
                    "containerName": "api",
                    "containerPort": 3000,
                }
            ],
        )
        print("ECS Service created")
    except ecs.exceptions.ClientException as e:
        if "already exists" in str(e):
            print("ECS Service already exists, updating desired count...")
            ecs.update_service(
                cluster=ECS_CLUSTER,
                service=ECS_SERVICE_NAME,
                desiredCount=1,
            )
        else:
            raise

    print("Environment started successfully")


def stop_environment():
    # 1. Stop ECS Service
    print("Stopping ECS Service...")
    try:
        ecs.update_service(
            cluster=ECS_CLUSTER,
            service=ECS_SERVICE_NAME,
            desiredCount=0,
        )
        print("ECS Service desired count set to 0")

        # Wait for tasks to stop
        time.sleep(10)

        ecs.delete_service(
            cluster=ECS_CLUSTER,
            service=ECS_SERVICE_NAME,
            force=True,
        )
        print("ECS Service deleted")
    except ecs.exceptions.ServiceNotFoundException:
        print("ECS Service not found, skipping")

    # 2. Delete ALB resources
    print("Deleting ALB resources...")
    alb_name = f"{PROJECT_NAME}-{ENVIRONMENT}"
    try:
        albs = elbv2.describe_load_balancers(Names=[alb_name])
        if albs["LoadBalancers"]:
            alb_arn = albs["LoadBalancers"][0]["LoadBalancerArn"]

            # Delete listeners
            listeners = elbv2.describe_listeners(LoadBalancerArn=alb_arn)
            for listener in listeners["Listeners"]:
                elbv2.delete_listener(ListenerArn=listener["ListenerArn"])
                print(f"Listener deleted: {listener['ListenerArn']}")

            # Delete ALB
            elbv2.delete_load_balancer(LoadBalancerArn=alb_arn)
            print(f"ALB deleted: {alb_arn}")

            # Wait for ALB to be deleted before deleting target groups
            waiter = elbv2.get_waiter("load_balancers_deleted")
            waiter.wait(LoadBalancerArns=[alb_arn])
    except elbv2.exceptions.LoadBalancerNotFoundException:
        print("ALB not found, skipping")

    # Delete target groups
    try:
        tgs = elbv2.describe_target_groups(
            Names=[f"{PROJECT_NAME}-{ENVIRONMENT}-api"]
        )
        for tg in tgs["TargetGroups"]:
            elbv2.delete_target_group(TargetGroupArn=tg["TargetGroupArn"])
            print(f"Target Group deleted: {tg['TargetGroupArn']}")
    except elbv2.exceptions.TargetGroupNotFoundException:
        print("Target Group not found, skipping")

    # 3. Stop RDS
    print("Stopping RDS instance...")
    try:
        rds.stop_db_instance(DBInstanceIdentifier=DB_INSTANCE_ID)
        print("RDS stop initiated")
    except rds.exceptions.InvalidDBInstanceStateFault:
        print("RDS is already stopped or stopping")

    print("Environment stopped successfully")
