import ActivityKit
import SwiftUI
import WidgetKit

@main
struct WalkLiveActivityBundle: WidgetBundle {
    var body: some Widget {
        WalkLiveActivity()
    }
}

struct WalkLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: WalkAttributes.self) { context in
            WalkLockScreenView(context: context)
                .padding(16)
                .activityBackgroundTint(Color.black.opacity(0.6))
                .activitySystemActionForegroundColor(Color.white)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Label(context.attributes.dogName, systemImage: "pawprint.fill")
                        .foregroundStyle(.white)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text(timerInterval: context.attributes.startedAt...Date.distantFuture,
                         countsDown: false)
                        .monospacedDigit()
                        .foregroundStyle(.white)
                }
                DynamicIslandExpandedRegion(.center) {
                    Text(formatDistance(context.state.distanceM))
                        .font(.headline)
                        .foregroundStyle(.white)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    WalkEventButtons(lastEventKind: context.state.lastEventKind)
                }
            } compactLeading: {
                Image(systemName: "pawprint.fill")
                    .foregroundStyle(.green)
            } compactTrailing: {
                Text(timerInterval: context.attributes.startedAt...Date.distantFuture,
                     countsDown: false)
                    .monospacedDigit()
                    .frame(maxWidth: 44)
            } minimal: {
                Image(systemName: "pawprint.fill")
                    .foregroundStyle(.green)
            }
        }
    }
}

struct WalkLockScreenView: View {
    let context: ActivityViewContext<WalkAttributes>

    var body: some View {
        VStack(spacing: 12) {
            HStack(alignment: .center, spacing: 16) {
                VStack(alignment: .leading, spacing: 4) {
                    Label(context.attributes.dogName, systemImage: "pawprint.fill")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(.white)
                    Text(timerInterval: context.attributes.startedAt...Date.distantFuture,
                         countsDown: false)
                        .font(.system(size: 28, weight: .bold, design: .rounded))
                        .monospacedDigit()
                        .foregroundStyle(.white)
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 4) {
                    Text("distance")
                        .font(.caption2)
                        .foregroundStyle(.white.opacity(0.7))
                    Text(formatDistance(context.state.distanceM))
                        .font(.system(size: 22, weight: .semibold, design: .rounded))
                        .monospacedDigit()
                        .foregroundStyle(.white)
                }
            }
            WalkEventButtons(lastEventKind: context.state.lastEventKind)
        }
    }
}

struct WalkEventButtons: View {
    let lastEventKind: String?

    var body: some View {
        HStack(spacing: 12) {
            Button(intent: PeeIntent()) {
                eventLabel(emoji: "🚽", text: "Pee", highlighted: lastEventKind == "pee")
            }
            .buttonStyle(.plain)

            Button(intent: PooIntent()) {
                eventLabel(emoji: "💩", text: "Poo", highlighted: lastEventKind == "poo")
            }
            .buttonStyle(.plain)
        }
    }

    @ViewBuilder
    private func eventLabel(emoji: String, text: String, highlighted: Bool) -> some View {
        HStack(spacing: 6) {
            Text(emoji)
            Text(text)
                .font(.footnote.weight(.semibold))
                .foregroundStyle(.white)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 10)
        .background(highlighted ? Color.green.opacity(0.4) : Color.white.opacity(0.15))
        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
    }
}

func formatDistance(_ meters: Double) -> String {
    if meters >= 1000 {
        return String(format: "%.2f km", meters / 1000)
    }
    return String(format: "%.0f m", meters)
}
