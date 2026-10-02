package com.example.data.repository

import com.example.data.model.ConnectivityState
import com.example.data.model.AppState
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

class SyncCoordinator(
    private val repository: SovereignRepository,
    private val connectivityMonitor: ConnectivityMonitor
) {
    private val _systemMode = MutableStateFlow<ConnectivityState>(ConnectivityState.Connected)
    val systemMode = _systemMode.asStateFlow()

    init {
        // Invariant 1: Force Loopback on disconnect
        CoroutineScope(Dispatchers.Default).launch {
            connectivityMonitor.networkStatus.collect { online ->
                _systemMode.value = if (online) ConnectivityState.Connected else ConnectivityState.VirtualParityLoopback
            }
        }
    }

    suspend fun reconcile(local: AppState, remote: AppState): AppState {
        // Invariant 2: State-Entropy Reconciliation
        return try {
            if (_systemMode.value is ConnectivityState.Connected) {
                repository.reconcileState(local, remote)
            } else {
                local
            }
        } catch (e: Exception) {
            _systemMode.value = ConnectivityState.VirtualParityLoopback
            local // Return local during failure
        }
    }

    fun setSystemMode(mode: ConnectivityState) {
        _systemMode.value = mode
    }
}
