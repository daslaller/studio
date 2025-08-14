import type { LiveDataPoint, InterpolatedDataPoint } from './types';

/**
 * Optimized data queue that preserves the 8ms main thread processing design
 * while preventing memory bloat and improving efficiency
 */
export class OptimizedDataQueue {
  private queue: LiveDataPoint[] = [];
  private maxSize = 1000; // Prevent memory bloat on slow processing
  private lastProcessTime = 0;
  
  /**
   * Called by Web Worker - adds data to queue (unchanged from original design)
   */
  enqueue(dataPoint: LiveDataPoint): void {
    this.queue.push(dataPoint);
    
    // Prevent memory issues on slow processing devices
    if (this.queue.length > this.maxSize) {
      this.queue = this.queue.slice(-this.maxSize);
    }
  }
  
  /**
   * Called every 8ms by main thread - preserves original queue logic
   */
  dequeue(algorithm: 'binary' | 'iterative', currentTime: number): LiveDataPoint | null {
    if (this.queue.length === 0) return null;
    
    // Respect the 8ms timing constraint (original design)
    if (currentTime - this.lastProcessTime < 8) return null;
    this.lastProcessTime = currentTime;
    
    if (algorithm === 'binary') {
      // Original logic: one point at a time for binary search
      return this.queue.shift() || null;
    } else {
      // Original logic: smart frame skipping for iterative
      const skipCount = Math.max(1, Math.floor(this.queue.length / 10));
      const skipped = this.queue.splice(0, skipCount);
      return skipped[skipped.length - 1] || null;
    }
  }
  
  get length(): number { 
    return this.queue.length; 
  }
  
  clear(): void { 
    this.queue = []; 
    this.lastProcessTime = 0;
  }
}

/**
 * Memory-efficient circular buffer for processed simulation data
 * Replaces growing arrays to prevent memory bloat and GC pressure
 */
export class CircularDataBuffer {
  private buffer: LiveDataPoint[];
  private head = 0;
  private size = 0;
  
  constructor(private capacity = 400) {
    this.buffer = new Array(capacity);
  }
  
  /**
   * Called every 8ms from the queue system - adds processed data point
   */
  add(point: LiveDataPoint): void {
    this.buffer[this.head] = point;
    this.head = (this.head + 1) % this.capacity;
    this.size = Math.min(this.size + 1, this.capacity);
  }
  
  /**
   * Returns data for chart rendering - efficient access pattern
   */
  getDisplayData(): LiveDataPoint[] {
    if (this.size === 0) return [];
    
    const result: LiveDataPoint[] = [];
    for (let i = 0; i < this.size; i++) {
      const index = (this.head - this.size + i + this.capacity) % this.capacity;
      result.push(this.buffer[index]);
    }
    return result;
  }
  
  /**
   * Get the last N points efficiently
   */
  getLastPoints(count: number): LiveDataPoint[] {
    const actualCount = Math.min(count, this.size);
    if (actualCount === 0) return [];
    
    const result: LiveDataPoint[] = [];
    for (let i = actualCount - 1; i >= 0; i--) {
      const index = (this.head - 1 - i + this.capacity) % this.capacity;
      result.unshift(this.buffer[index]);
    }
    return result;
  }
  
  /**
   * Get the previous point for interpolation
   */
  getPrevious(): LiveDataPoint | null {
    if (this.size < 2) return null;
    const index = (this.head - 2 + this.capacity) % this.capacity;
    return this.buffer[index];
  }
  
  /**
   * Get the current (last added) point
   */
  getCurrent(): LiveDataPoint | null {
    if (this.size === 0) return null;
    const index = (this.head - 1 + this.capacity) % this.capacity;
    return this.buffer[index];
  }
  
  clear(): void {
    this.size = 0;
    this.head = 0;
  }
  
  get length(): number { 
    return this.size; 
  }
}

/**
 * Smooth interpolation between data points using easing
 * Preserves the 8ms queue timing while providing 60fps visual smoothness
 */
export class EasingInterpolator {
  /**
   * Easing function for smooth animations
   */
  private easeInOutQuad(t: number): number {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }
  
  /**
   * Interpolate between two data points with easing
   */
  interpolate(
    from: LiveDataPoint | null, 
    to: LiveDataPoint, 
    progress: number
  ): InterpolatedDataPoint {
    if (!from) {
      return {
        ...to,
        isInterpolated: false,
        timestamp: performance.now()
      };
    }
    
    const easedProgress = this.easeInOutQuad(Math.max(0, Math.min(1, progress)));
    
    return {
      current: from.current + (to.current - from.current) * easedProgress,
      temperature: from.temperature + (to.temperature - from.temperature) * easedProgress,
      powerLoss: from.powerLoss + (to.powerLoss - from.powerLoss) * easedProgress,
      conductionLoss: from.conductionLoss + (to.conductionLoss - from.conductionLoss) * easedProgress,
      switchingLoss: from.switchingLoss + (to.switchingLoss - from.switchingLoss) * easedProgress,
      progress: from.progress + (to.progress - from.progress) * easedProgress,
      limitValue: to.limitValue, // Use target limit value
      isInterpolated: true,
      timestamp: performance.now()
    };
  }
}

/**
 * Throttle function for performance optimization
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;
  let lastExecTime = 0;
  
  return (...args: Parameters<T>) => {
    const currentTime = Date.now();
    
    if (currentTime - lastExecTime > delay) {
      func(...args);
      lastExecTime = currentTime;
    } else {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        func(...args);
        lastExecTime = Date.now();
      }, delay - (currentTime - lastExecTime));
    }
  };
}

/**
 * Check if data change is visually significant enough to trigger chart re-render
 */
export function hasSignificantChange(
  oldData: LiveDataPoint[], 
  newData: LiveDataPoint[]
): boolean {
  if (oldData.length === 0) return true;
  if (Math.abs(oldData.length - newData.length) > 5) return true; // Batched changes
  
  const lastOld = oldData[oldData.length - 1];
  const lastNew = newData[newData.length - 1];
  
  if (!lastOld || !lastNew) return true;
  
  // Only update if current changed significantly (0.1A threshold)
  return Math.abs(lastOld.current - lastNew.current) > 0.1;
}

/**
 * Decimate data points for efficient chart rendering while preserving visual fidelity
 */
export function decimateData(data: LiveDataPoint[], maxPoints: number): LiveDataPoint[] {
  if (data.length <= maxPoints) return data;
  
  const step = data.length / maxPoints;
  const decimated: LiveDataPoint[] = [];
  
  for (let i = 0; i < data.length; i += step) {
    decimated.push(data[Math.floor(i)]);
  }
  
  return decimated;
}