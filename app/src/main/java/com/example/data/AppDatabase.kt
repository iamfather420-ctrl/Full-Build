package com.example.data

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase

@Database(
    entities = [
        TetherNode::class,
        LogEvent::class,
        B2BAccount::class,
        ConsensusTask::class,
        SolvedParadox::class,
        BalanceSheetRecord::class
    ],
    version = 3,
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun tetherNodeDao(): TetherNodeDao
    abstract fun logEventDao(): LogEventDao
    abstract fun b2bAccountDao(): B2BAccountDao
    abstract fun consensusTaskDao(): ConsensusTaskDao
    abstract fun solvedParadoxDao(): SolvedParadoxDao
    abstract fun balanceSheetDao(): BalanceSheetDao

    companion object {
        @Volatile
        private var INSTANCE: AppDatabase? = null

        fun getDatabase(context: Context): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "corporate_workspace_db"
                )
                .fallbackToDestructiveMigration()
                .build()
                INSTANCE = instance
                instance
            }
        }
    }
}
