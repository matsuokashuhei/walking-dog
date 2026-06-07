import { WalkEndSlideControl } from './WalkEndSlideControl';

interface WalkControlsActionsProps {
  isStopping: boolean;
  onStop: () => void;
}

// 記録中パネル下部の終了操作を、誤タップしにくいスライド操作として表示します。
export function WalkControlsActions({ isStopping, onStop }: WalkControlsActionsProps) {
  return <WalkEndSlideControl disabled={isStopping} loading={isStopping} onConfirm={onStop} />;
}
