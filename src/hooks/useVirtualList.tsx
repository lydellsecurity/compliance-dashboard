/**
 * Virtual List Hook
 *
 * Provides virtualization for large lists without external dependencies.
 * Renders only visible items + overscan buffer for smooth scrolling.
 */

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';

interface UseVirtualListOptions {
  /** Total number of items */
  itemCount: number;
  /** Height of each item in pixels */
  itemHeight: number;
  /** Extra items to render above/below visible area */
  overscan?: number;
  /** Optional callback when visible range changes */
  onRangeChange?: (startIndex: number, endIndex: number) => void;
}

interface VirtualListState {
  /** Index of first rendered item */
  startIndex: number;
  /** Index of last rendered item */
  endIndex: number;
  /** Offset from top of container */
  offsetTop: number;
}

interface UseVirtualListReturn {
  /** Ref to attach to scrollable container */
  containerRef: React.RefObject<HTMLDivElement>;
  /** Current virtual state */
  virtualState: VirtualListState;
  /** Total height of all items (for scroll area) */
  totalHeight: number;
  /** Items to render with their virtual indices */
  virtualItems: Array<{
    index: number;
    offsetTop: number;
  }>;
  /** Scroll to a specific index */
  scrollToIndex: (index: number, behavior?: ScrollBehavior) => void;
  /** Check if an index is currently visible */
  isItemVisible: (index: number) => boolean;
}

export function useVirtualList({
  itemCount,
  itemHeight,
  overscan = 5,
  onRangeChange,
}: UseVirtualListOptions): UseVirtualListReturn {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  // Calculate visible range
  const virtualState = useMemo(() => {
    const visibleStart = Math.floor(scrollTop / itemHeight);
    const visibleEnd = Math.ceil((scrollTop + containerHeight) / itemHeight);

    const startIndex = Math.max(0, visibleStart - overscan);
    const endIndex = Math.min(itemCount - 1, visibleEnd + overscan);

    return {
      startIndex,
      endIndex,
      offsetTop: startIndex * itemHeight,
    };
  }, [scrollTop, containerHeight, itemHeight, itemCount, overscan]);

  // Total height for scroll area
  const totalHeight = itemCount * itemHeight;

  // Generate virtual items array
  const virtualItems = useMemo(() => {
    const items: Array<{ index: number; offsetTop: number }> = [];
    for (let i = virtualState.startIndex; i <= virtualState.endIndex; i++) {
      items.push({
        index: i,
        offsetTop: i * itemHeight,
      });
    }
    return items;
  }, [virtualState.startIndex, virtualState.endIndex, itemHeight]);

  // Handle scroll events
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      setScrollTop(container.scrollTop);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Observe container size changes
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  // Notify range changes
  useEffect(() => {
    onRangeChange?.(virtualState.startIndex, virtualState.endIndex);
  }, [virtualState.startIndex, virtualState.endIndex, onRangeChange]);

  // Scroll to index
  const scrollToIndex = useCallback((index: number, behavior: ScrollBehavior = 'smooth') => {
    const container = containerRef.current;
    if (!container) return;

    const targetTop = index * itemHeight;
    container.scrollTo({ top: targetTop, behavior });
  }, [itemHeight]);

  // Check if item is visible
  const isItemVisible = useCallback((index: number) => {
    return index >= virtualState.startIndex && index <= virtualState.endIndex;
  }, [virtualState.startIndex, virtualState.endIndex]);

  return {
    containerRef,
    virtualState,
    totalHeight,
    virtualItems,
    scrollToIndex,
    isItemVisible,
  };
}

/**
 * Component wrapper for virtual list
 */
interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  overscan?: number;
  className?: string;
  renderItem: (item: T, index: number, style: React.CSSProperties) => React.ReactNode;
  emptyMessage?: string;
}

export function VirtualList<T>({
  items,
  itemHeight,
  overscan = 5,
  className = '',
  renderItem,
  emptyMessage = 'No items to display',
}: VirtualListProps<T>): JSX.Element {
  const { containerRef, totalHeight, virtualItems } = useVirtualList({
    itemCount: items.length,
    itemHeight,
    overscan,
  });

  if (items.length === 0) {
    return (
      <div className={`flex items-center justify-center py-12 text-secondary ${className}`}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ contain: 'strict' }}
    >
      <div
        style={{
          height: totalHeight,
          position: 'relative',
          width: '100%',
        }}
      >
        {virtualItems.map(({ index, offsetTop }) => {
          const style: React.CSSProperties = {
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: itemHeight,
            transform: `translateY(${offsetTop}px)`,
          };
          return renderItem(items[index], index, style);
        })}
      </div>
    </div>
  );
}

export default useVirtualList;
