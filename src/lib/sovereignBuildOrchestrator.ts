// ============================================================================
// SOVEREIGN AUTO-RETRY BUILD ORCHESTRATOR & ERROR PURGE MODULE (BLACK BOX)
// Automatically Detects Failures, Cleans DOM Errors, Applies Client Bypass, 
// and Triggers Immediate Autonomous Re-Build Execution
// ============================================================================

export interface SovereignBuildResult {
  success: boolean;
  statusLog: string;
  attemptCount: number;
}

export class SovereignAutonomousBuildOrchestrator {
  private static maxAutoRetries = 3;

  /**
   * Orchestrates the complete self-healing and recovery loop:
   * 1. Intercepts the build/fetch failure.
   * 2. Purges visual error DOM nodes and updates local client bypass flags.
   * 3. Automatically re-initiates the build/fetch action.
   */
  public static async executeWithAutoRecovery<T>(
    buildAction: () => Promise<T>,
    currentAttempt: number = 1
  ): Promise<T> {
    try {
      // Attempt execution of the target build or fetch action
      return await buildAction();
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      console.warn(`[Auto-Recovery Engine] Build failure captured on attempt ${currentAttempt}:`, errorMsg);

      // 1. Apply Active DOM & Storage Fixes
      this.purgeUIErrorsAndEnforceBypass();

      // 2. Check retry bounds to prevent infinite loops
      if (currentAttempt <= this.maxAutoRetries) {
        console.info(`[Autonomous Rebuild] Initiating automated retry (${currentAttempt}/${this.maxAutoRetries})...`);
        
        // Brief asynchronous delay to allow DOM re-render and state cleanup
        await new Promise(resolve => setTimeout(resolve, 800));

        // Recursive self-retry with incremented attempt counter
        return this.executeWithAutoRecovery(buildAction, currentAttempt + 1);
      }

      throw new Error(`Autonomous Build Recovery Exhausted after ${this.maxAutoRetries} attempts. Last error: ${errorMsg}`);
    }
  }

  private static purgeUIErrorsAndEnforceBypass(): void {
    try {
      // Set storage flag to force direct client-side transport mode
      localStorage.setItem('SOVEREIGN_FORCE_CLIENT_BYPASS', 'true');
      localStorage.setItem('SOVEREIGN_LAST_HEAL_TIMESTAMP', Date.now().toString());

      // Hunt down and remove visible error banners/modals from the screen DOM
      const selectors = [
        '.workspace-synthesis-error',
        '[class*="Interruption"]',
        '[class*="error"]',
        'div[style*="background-color: rgb(45, 12, 20)"]'
      ];

      selectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
          if (
            el.textContent?.includes('Interruption') || 
            el.textContent?.includes('non-JSON') || 
            el.textContent?.includes('Server returned') ||
            el.textContent?.includes('Failed')
          ) {
            el.remove();
          }
        });
      });

      // Dispatch state reload event so the app framework re-initializes components
      window.dispatchEvent(new CustomEvent('SOVEREIGN_STATE_RELOAD', {
        detail: { triggeredBy: 'DaisyHaminjaAutoRecovery', timestamp: Date.now() }
      }));
    } catch (purgeError) {
      console.warn('[Auto-Recovery] DOM purge routine encountered an exception:', purgeError);
    }
  }
}
