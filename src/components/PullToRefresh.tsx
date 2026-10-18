interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: React.ReactNode;
}

const PullToRefresh = ({ onRefresh: _onRefresh, children }: PullToRefreshProps) => {
  return (
    <div
      className="h-full overflow-y-auto overscroll-y-contain scrollbar-hide"
      style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
    >
      {children}
    </div>
  );
};

export default PullToRefresh;
