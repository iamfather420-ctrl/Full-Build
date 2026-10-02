package com.example.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import com.example.data.model.TetherBubble
import com.example.data.model.SovereignSolution
import com.example.data.model.SystemMilestone

@Database(
    entities = [TetherBubble::class, SovereignSolution::class, SystemMilestone::class],
    version = 1,
    exportSchema = false
)
abstract class SovereignDatabase : RoomDatabase() {
    abstract fun sovereignDao(): SovereignDao

    companion object {
        @Volatile
        private var INSTANCE: SovereignDatabase? = null

        fun getDatabase(context: Context): SovereignDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    SovereignDatabase::class.java,
                    "daisy_sovereign_db"
                )
                .fallbackToDestructiveMigration()
                .build()
                INSTANCE = instance
                instance
            }
        }
    }
}
