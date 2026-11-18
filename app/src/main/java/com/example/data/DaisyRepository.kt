package com.example.data

import kotlinx.coroutines.flow.Flow

class DaisyRepository(private val dao: DaisyDao) {

    val ingressFiles: Flow<List<IngressFile>> = dao.getAllIngressFiles()
    val tetherNodes: Flow<List<DaisyTetherNode>> = dao.getAllTetherNodes()
    val discoveryLinks: Flow<List<DiscoveryLink>> = dao.getAllDiscoveryLinks()
    val consensusTasks: Flow<List<DaisyConsensusTask>> = dao.getAllConsensusTasks()
    val logEvents: Flow<List<DaisyLogEvent>> = dao.getAllLogEvents()

    suspend fun insertIngressFile(file: IngressFile) = dao.insertIngressFile(file)
    suspend fun clearAllIngressFiles() = dao.clearAllIngressFiles()

    suspend fun getTetherNodeById(sessionId: String): DaisyTetherNode? = dao.getTetherNodeById(sessionId)
    suspend fun insertTetherNode(node: DaisyTetherNode) = dao.insertTetherNode(node)
    suspend fun deleteTetherNode(sessionId: String) = dao.deleteTetherNode(sessionId)
    suspend fun clearAllTetherNodes() = dao.clearAllTetherNodes()

    suspend fun insertDiscoveryLink(link: DiscoveryLink) = dao.insertDiscoveryLink(link)
    suspend fun clearAllDiscoveryLinks() = dao.clearAllDiscoveryLinks()

    suspend fun insertDaisyConsensusTask(task: DaisyConsensusTask): Long = dao.insertConsensusTask(task)
    suspend fun clearAllConsensusTasks() = dao.clearAllConsensusTasks()

    suspend fun log(message: String, type: String = "INFO") {
        dao.insertLogEvent(DaisyLogEvent(message = message, type = type))
    }
    suspend fun clearAllLogs() = dao.clearAllLogEvents()
}
