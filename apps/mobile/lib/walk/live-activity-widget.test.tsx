describe('walk live activity widget layout', () => {
  it('keeps pee and poop emoji literals inside the widget function source', () => {
    let capturedLayout: unknown;

    jest.isolateModules(() => {
      jest.doMock('@expo/ui/swift-ui', () => ({
        Button: 'Button',
        HStack: 'HStack',
        Image: 'Image',
        Spacer: 'Spacer',
        Text: 'Text',
        VStack: 'VStack',
      }));
      jest.doMock('@expo/ui/swift-ui/modifiers', () => ({
        buttonStyle: jest.fn((value) => ({ buttonStyle: value })),
        containerBackground: jest.fn((color, target) => ({ containerBackground: { color, target } })),
        controlSize: jest.fn((value) => ({ controlSize: value })),
        font: jest.fn((value) => ({ font: value })),
        foregroundStyle: jest.fn((value) => ({ foregroundStyle: value })),
        frame: jest.fn((value) => ({ frame: value })),
        lineLimit: jest.fn((value) => ({ lineLimit: value })),
        monospacedDigit: jest.fn(() => ({ monospacedDigit: true })),
        padding: jest.fn((value) => ({ padding: value })),
        tint: jest.fn((value) => ({ tint: value })),
      }));
      jest.doMock('expo-widgets', () => ({
        createLiveActivity: jest.fn((_name, layout) => {
          capturedLayout = layout;
          return { getInstances: jest.fn(), start: jest.fn() };
        }),
      }));

      require('./live-activity-widget');
    });

    const layoutSource = String(capturedLayout);

    expect(layoutSource).toContain('💧');
    expect(layoutSource).toContain('💩');
    expect(layoutSource).not.toContain('WALK_EVENT_EMOJIS');
  });
});
