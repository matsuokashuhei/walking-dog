# Dependency Policy

## Code Dependencies

product contextの内部コードが依存できるのは、自contextとdomain-neutralなplatformだけです。他contextのpackage pathを参照しません。

## Contract Dependencies

contextはregistryに登録されたprovider-owned contractだけを利用できます。generated client、generated type、event schemaはcontract artifactとして扱い、provider内部型とは分離します。

## Data Dependencies

consumerはproviderのdatabase name、schema、table、index、object key規則を知りません。必要な情報はAPI responseまたはevent snapshotとして受け取ります。

## Frontend Dependencies

featureはApp Shellへroute manifestを登録します。他featureのscreen、component、hook、cache、GraphQL documentを直接importしません。共有visual primitivesはDesign Systemから利用できます。
