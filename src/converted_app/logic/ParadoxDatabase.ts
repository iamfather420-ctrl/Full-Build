// Converted native logic from ParadoxDatabase.kt
/*
package com.example.data

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase

@Database(
    entities = [ParadoxEntity::class, AuditLogEntity::class, UserWalletEntity::class],
    version = 1,
    exportSchema = false
)
abstract class ParadoxDatabase : RoomDatabase() {
    abstract fun paradoxDao(): ParadoxDao

    companion object {
        @Volatile
        private var INSTANCE: ParadoxDatabase? = null

        fun getDatabase(context: Context): ParadoxDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    ParadoxDatabase::class.java,
                    "paradox_database"
                )
                .fallbackToDestructiveMigration()
                .build()
                INSTANCE = instance
                instance
            }
        }
    }
}

*/
