import { Button, HStack, Image, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  buttonStyle,
  containerBackground,
  controlSize,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  monospacedDigit,
  padding,
  tint,
} from '@expo/ui/swift-ui/modifiers';
import { createLiveActivity, type LiveActivityEnvironment } from 'expo-widgets';
import { WALK_ACTIVITY_NAME, type WalkActivityProps } from './live-activity';

function WalkActivityLayout(props: WalkActivityProps, _environment: LiveActivityEnvironment) {
  'widget';

  const peeEmoji = '💧';
  const pooEmoji = '💩';
  const accent = '#4F8A63';
  const destructive = '#C94D3F';
  const background = '#1F2A24';
  const foreground = '#F7FFF9';
  const secondary = '#D7E6DB';
  const startDate = new Date(props.startedAtMs);
  const elapsedTimerInterval = {
    lower: startDate,
    upper: new Date(props.startedAtMs + 7 * 24 * 60 * 60 * 1000),
  };
  const firstDog = props.dogs[0];

  const banner = (
    <VStack
      spacing={10}
      modifiers={[
        padding({ all: 14 }),
        containerBackground(background, 'widget'),
      ]}>
      <HStack spacing={8}>
        <VStack alignment="leading" spacing={2}>
          <Text modifiers={[font({ size: 12, weight: 'medium' }), foregroundStyle(secondary)]}>
            Walking
          </Text>
          <Text
            timerInterval={elapsedTimerInterval}
            countsDown={false}
            modifiers={[font({ size: 28, weight: 'bold', design: 'rounded' }), monospacedDigit(), foregroundStyle(foreground)]}
          />
        </VStack>
        <Spacer minLength={8} />
        <VStack alignment="trailing" spacing={2}>
          <Text modifiers={[font({ size: 12, weight: 'medium' }), foregroundStyle(secondary)]}>
            Distance
          </Text>
          <Text
            modifiers={[font({ size: 22, weight: 'bold', design: 'rounded' }), monospacedDigit(), foregroundStyle(foreground)]}>
            {props.distanceLabel}
          </Text>
        </VStack>
      </HStack>
      <VStack spacing={8}>
        {props.dogs.map((dog) => (
          <HStack key={dog.id} spacing={8}>
            <Text
              modifiers={[
                frame({ minWidth: 64, alignment: 'leading' }),
                font({ size: 13, weight: 'semibold' }),
                foregroundStyle(foreground),
                lineLimit(1),
              ]}>
              {dog.name}
            </Text>
            <Spacer minLength={2} />
            <Button
              label={`${peeEmoji} Pee ${dog.peeCount}`}
              target={dog.peeTarget}
              modifiers={[buttonStyle('bordered'), controlSize('small'), tint(accent)]}
            />
            <Button
              label={`${pooEmoji} Poop ${dog.pooCount}`}
              target={dog.pooTarget}
              modifiers={[buttonStyle('bordered'), controlSize('small'), tint('#8A6F4F')]}
            />
          </HStack>
        ))}
      </VStack>
      <Button
        label="End walk"
        systemImage="stop.circle.fill"
        role="destructive"
        target={props.finishTarget}
        modifiers={[buttonStyle('borderedProminent'), controlSize('small'), tint(destructive)]}
      />
    </VStack>
  );

  return {
    banner,
    compactLeading: <Image systemName="figure.walk" color={accent} />,
    compactTrailing: (
      <Text timerInterval={elapsedTimerInterval} countsDown={false} modifiers={[monospacedDigit(), foregroundStyle(foreground)]} />
    ),
    minimal: <Image systemName="pawprint.fill" color={accent} />,
    expandedLeading: (
      <VStack modifiers={[padding({ all: 8 })]}>
        <Image systemName="figure.walk" color={accent} />
        <Text modifiers={[font({ size: 11 }), foregroundStyle(secondary)]}>Walk</Text>
      </VStack>
    ),
    expandedTrailing: (
      <VStack alignment="trailing" modifiers={[padding({ all: 8 })]}>
        <Text modifiers={[font({ size: 18, weight: 'bold' }), monospacedDigit(), foregroundStyle(foreground)]}>
          {props.distanceLabel}
        </Text>
        <Text timerInterval={elapsedTimerInterval} countsDown={false} modifiers={[font({ size: 12 }), monospacedDigit(), foregroundStyle(secondary)]} />
      </VStack>
    ),
    expandedBottom: firstDog ? (
      <VStack modifiers={[padding({ all: 8 })]}>
        <HStack spacing={8}>
          <Text
            modifiers={[
              frame({ minWidth: 64, alignment: 'leading' }),
              font({ size: 13, weight: 'semibold' }),
              foregroundStyle(foreground),
              lineLimit(1),
            ]}>
            {firstDog.name}
          </Text>
          <Spacer minLength={2} />
          <Button
            label={`${peeEmoji} Pee ${firstDog.peeCount}`}
            target={firstDog.peeTarget}
            modifiers={[buttonStyle('bordered'), controlSize('small'), tint(accent)]}
          />
          <Button
            label={`${pooEmoji} Poop ${firstDog.pooCount}`}
            target={firstDog.pooTarget}
            modifiers={[buttonStyle('bordered'), controlSize('small'), tint('#8A6F4F')]}
          />
        </HStack>
        <Button
          label="End"
          systemImage="stop.circle.fill"
          role="destructive"
          target={props.finishTarget}
          modifiers={[buttonStyle('bordered'), controlSize('small'), tint(destructive)]}
        />
      </VStack>
    ) : undefined,
  };
}

export const WalkingDogWalkActivity = createLiveActivity<WalkActivityProps>(
  WALK_ACTIVITY_NAME,
  WalkActivityLayout,
);
