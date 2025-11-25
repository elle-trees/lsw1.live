/**
 * Example usage of AnimatedTabs component
 * 
 * This demonstrates how to use the animated tabs component with a moving indicator.
 * The indicator smoothly animates between tabs when switching.
 */

import { Tabs, AnimatedTabsList, AnimatedTabsTrigger, AnimatedTabsContent } from "./animated-tabs";

export function AnimatedTabsExample() {
  return (
    <Tabs defaultValue="overview" className="w-full">
      <AnimatedTabsList className="w-full justify-start">
        <AnimatedTabsTrigger value="overview">Overview</AnimatedTabsTrigger>
        <AnimatedTabsTrigger value="progression">Progression</AnimatedTabsTrigger>
        <AnimatedTabsTrigger value="breakdown">Breakdown</AnimatedTabsTrigger>
        <AnimatedTabsTrigger value="recent">Recent</AnimatedTabsTrigger>
      </AnimatedTabsList>
      
      <AnimatedTabsContent value="overview">
        <div className="p-4">Overview content goes here</div>
      </AnimatedTabsContent>
      
      <AnimatedTabsContent value="progression">
        <div className="p-4">Progression content goes here</div>
      </AnimatedTabsContent>
      
      <AnimatedTabsContent value="breakdown">
        <div className="p-4">Breakdown content goes here</div>
      </AnimatedTabsContent>
      
      <AnimatedTabsContent value="recent">
        <div className="p-4">Recent content goes here</div>
      </AnimatedTabsContent>
    </Tabs>
  );
}

/**
 * Custom styling example:
 * 
 * <AnimatedTabsList 
 *   className="bg-ctp-surface0 border border-ctp-surface1"
 *   indicatorClassName="bg-ctp-blue h-1"
 * >
 *   <AnimatedTabsTrigger 
 *     value="tab1"
 *     className="data-[state=active]:text-ctp-blue"
 *   >
 *     Tab 1
 *   </AnimatedTabsTrigger>
 * </AnimatedTabsList>
 */

