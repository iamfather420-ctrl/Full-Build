package com.example

import android.app.Application
import android.content.Context
import androidx.test.core.app.ApplicationProvider
import com.example.ui.DaisyViewModel
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.shadows.ShadowLooper

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [36])
class ExampleRobolectricTest {

  private suspend fun awaitCondition(timeoutMs: Long = 4000, condition: () -> Boolean) {
    val startTime = System.currentTimeMillis()
    while (!condition() && (System.currentTimeMillis() - startTime) < timeoutMs) {
      ShadowLooper.idleMainLooper()
      kotlinx.coroutines.delay(50)
    }
    ShadowLooper.idleMainLooper()
  }

  @Test
  fun `verify app launcher name is DAISY Core`() {
    val context = ApplicationProvider.getApplicationContext<Context>()
    val appName = context.getString(R.string.app_name)
    assertEquals("DAISY Core", appName)
  }

  @Test
  fun `verify viewModel pre-populates default tethers on launch`() = runBlocking {
    val application = ApplicationProvider.getApplicationContext<Application>()
    val viewModel = DaisyViewModel(application)

    // Wait for asynchronous init insertions to propagate
    awaitCondition { viewModel.tetherNodes.value.size == 2 }

    val nodes = viewModel.tetherNodes.value
    assertEquals(2, nodes.size)
    assertEquals("Google AI Studio (Active)", nodes[0].name)
    assertEquals("Meta AI (Backup)", nodes[1].name)
  }

  @Test
  fun `verify custom tether node binding`() = runBlocking {
    val application = ApplicationProvider.getApplicationContext<Application>()
    val viewModel = DaisyViewModel(application)

    awaitCondition { viewModel.tetherNodes.value.size == 2 }

    // Set input fields and perform binding
    viewModel.nodeNameInput.value = "Custom Node Gamma"
    viewModel.targetElementInput.value = "input#custom-query"
    viewModel.targetBucketInput.value = "METADATA"
    viewModel.performBindElement()

    // Wait until custom binding propagates
    awaitCondition { viewModel.tetherNodes.value.size == 3 }

    val updatedNodes = viewModel.tetherNodes.value
    val gammaNode = updatedNodes.find { it.name == "Custom Node Gamma" }
    assertNotNull(gammaNode)
    assertEquals("input#custom-query", gammaNode?.targetElement)
    assertEquals("METADATA", gammaNode?.targetBucket)
  }

  @Test
  fun `verify severing tether removes node`() = runBlocking {
    val application = ApplicationProvider.getApplicationContext<Application>()
    val viewModel = DaisyViewModel(application)

    awaitCondition { viewModel.tetherNodes.value.size == 2 }

    val initialNodes = viewModel.tetherNodes.value
    val initialSize = initialNodes.size
    val targetId = initialNodes[0].sessionId

    viewModel.severTether(targetId)

    // Wait until sever operation completes
    awaitCondition { viewModel.tetherNodes.value.size == initialSize - 1 }

    val updatedNodes = viewModel.tetherNodes.value
    assertEquals(initialSize - 1, updatedNodes.size)
    assertTrue(updatedNodes.none { it.sessionId == targetId })
  }

  @Test
  fun `verify manual file ingestion`() = runBlocking {
    val application = ApplicationProvider.getApplicationContext<Application>()
    val viewModel = DaisyViewModel(application)

    awaitCondition { viewModel.tetherNodes.value.size == 2 }

    viewModel.ingestManualFile("SecureModule.kt", "class SecureModule { val key = 123 }")

    // Wait for manual file ingestion to propagate
    awaitCondition { viewModel.ingressFiles.value.any { it.name == "SecureModule.kt" } }

    val files = viewModel.ingressFiles.value
    val ingested = files.find { it.name == "SecureModule.kt" }
    
    assertNotNull(ingested)
    assertEquals("class SecureModule { val key = 123 }", ingested?.content)
  }

  @Test
  fun `verify log telemetry events are registered`() = runBlocking {
    val application = ApplicationProvider.getApplicationContext<Application>()
    val viewModel = DaisyViewModel(application)

    // Wait until startup logs are registered
    awaitCondition { viewModel.logEvents.value.isNotEmpty() }

    // Verify initial log events exist
    val logs = viewModel.logEvents.value
    assertTrue(logs.any { it.message.contains("background intelligence layer successfully started") })

    // Verify clearing logs
    viewModel.clearLogs()
    
    // Wait until cleared
    awaitCondition { viewModel.logEvents.value.isEmpty() }

    val clearedLogs = viewModel.logEvents.value
    assertTrue(clearedLogs.isEmpty())
  }
}



