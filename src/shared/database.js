import sqlite3 from 'sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, existsSync, chmodSync, constants } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbDir = join(__dirname, '../../database');
if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
  
  try {
    chmodSync(dbDir, 0o755);
    console.log('✅ Database directory permissions set');
  } catch (error) {
    console.warn('⚠️ Could not set directory permissions:', error.message);
  }
}

const dbPath = join(dbDir, 'database.db');

class Database {
  constructor() {
    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('❌ Error opening database:', err);
      } else {
        console.log('📦 Database connected successfully');
        this.setDatabasePermissions();
      }
    });
    this.initTables();
  }

  setDatabasePermissions() {
    try {
      chmodSync(dbPath, 0o666);
      console.log('✅ Database file permissions set automatically');
    } catch (error) {
      console.warn('⚠️ Could not set database file permissions automatically:', error.message);
      console.log('💡 Manual fix: Run "chmod 666 database/database.db" if you encounter write errors');
    }
  }

  initTables() {
    console.log('🔧 Initializing database tables...');
    
    this.db.serialize(() => {
      this.db.run(`
        CREATE TABLE IF NOT EXISTS users (
          discord_id TEXT PRIMARY KEY,
          username TEXT NOT NULL,
          discriminator TEXT NOT NULL,
          avatar TEXT,
          coins REAL DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          console.error('❌ Error creating users table:', err);
        } else {
          console.log('✅ Users table ready');
        }
      });

      this.db.run(`
        CREATE TABLE IF NOT EXISTS codes (
          id TEXT PRIMARY KEY,
          code TEXT UNIQUE NOT NULL,
          max_slots INTEGER NOT NULL,
          used_slots INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          date_created TEXT NOT NULL,
          is_active BOOLEAN DEFAULT 1
        )
      `, (err) => {
        if (err) {
          console.error('❌ Error creating codes table:', err);
        } else {
          console.log('✅ Codes table ready');
        }
      });

      this.db.run(`
        CREATE TABLE IF NOT EXISTS code_redemptions (
          id TEXT PRIMARY KEY,
          code_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          coins_earned REAL NOT NULL,
          redeemed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (code_id) REFERENCES codes (id),
          FOREIGN KEY (user_id) REFERENCES users (discord_id)
        )
      `, (err) => {
        if (err) {
          console.error('❌ Error creating code_redemptions table:', err);
        } else {
          console.log('✅ Code redemptions table ready (with coins_earned column)');
        }
      });

      this.db.run(`
        CREATE TABLE IF NOT EXISTS bot_state (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          console.error('❌ Error creating bot_state table:', err);
        } else {
          console.log('✅ Bot state table ready');
        }
      });
    });
  }

  async getUser(discordId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM users WHERE discord_id = ?',
        [discordId],
        (err, row) => {
          if (err) {
            console.error('Database error in getUser:', err);
            reject(err);
          } else if (row) {
            resolve({
              discordId: row.discord_id,
              username: row.username,
              discriminator: row.discriminator,
              avatar: row.avatar,
              coins: row.coins,
              createdAt: new Date(row.created_at)
            });
          } else {
            resolve(null);
          }
        }
      );
    });
  }

  async createUser(user) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT INTO users (discord_id, username, discriminator, avatar) VALUES (?, ?, ?, ?)',
        [user.discordId, user.username, user.discriminator, user.avatar],
        function(err) {
          if (err) {
            console.error('Database error in createUser:', err);
            reject(err);
          } else {
            console.log(`👤 Created new user: ${user.username}#${user.discriminator} (${user.discordId})`);
            resolve({
              ...user,
              coins: 0,
              createdAt: new Date()
            });
          }
        }
      );
    });
  }

  async updateUserCoins(discordId, coins) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'UPDATE users SET coins = coins + ? WHERE discord_id = ?',
        [coins, discordId],
        function(err) {
          if (err) {
            console.error('Database error in updateUserCoins:', err);
            reject(err);
          } else {
            console.log(`💰 Updated coins for user ${discordId}: ${coins > 0 ? '+' : ''}${coins}`);
            resolve();
          }
        }
      );
    });
  }

  async createCode(code) {
    return new Promise((resolve, reject) => {
      console.log('📝 Creating code in database:', { 
        id: code.id, 
        code: code.code, 
        maxSlots: code.maxSlots, 
        dateCreated: code.dateCreated 
      });
      
      this.db.run(
        'INSERT INTO codes (id, code, max_slots, date_created) VALUES (?, ?, ?, ?)',
        [code.id, code.code, code.maxSlots, code.dateCreated],
        function(err) {
          if (err) {
            console.error('Database error in createCode:', err);
            console.error('Failed to insert code:', { 
              id: code.id, 
              code: code.code, 
              maxSlots: code.maxSlots, 
              dateCreated: code.dateCreated 
            });
            reject(err);
          } else {
            console.log(`✅ Code created successfully in database: ${code.code}`);
            resolve({
              ...code,
              usedSlots: 0,
              createdAt: new Date(),
              isActive: true
            });
          }
        }
      );
    });
  }

  async getTodayCode(dateString) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM codes WHERE date_created = ? AND is_active = 1',
        [dateString],
        (err, row) => {
          if (err) {
            console.error('Database error in getTodayCode:', err);
            reject(err);
          } else if (row) {
            resolve({
              id: row.id,
              code: row.code,
              maxSlots: row.max_slots,
              usedSlots: row.used_slots,
              createdAt: new Date(row.created_at),
              dateCreated: row.date_created,
              isActive: Boolean(row.is_active)
            });
          } else {
            resolve(null);
          }
        }
      );
    });
  }

  async getCode(code) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM codes WHERE code = ? AND is_active = 1',
        [code],
        (err, row) => {
          if (err) {
            console.error('Database error in getCode:', err);
            reject(err);
          } else if (row) {
            resolve({
              id: row.id,
              code: row.code,
              maxSlots: row.max_slots,
              usedSlots: row.used_slots,
              createdAt: new Date(row.created_at),
              isActive: Boolean(row.is_active)
            });
          } else {
            resolve(null);
          }
        }
      );
    });
  }

  async redeemCode(codeId, userId, coinsEarned) {
    return new Promise((resolve, reject) => {
      console.log(`🎟️ Attempting to redeem code: ${codeId} for user: ${userId} with ${coinsEarned} coins`);
      
      const db = this.db;

      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        db.get(
          'SELECT id FROM code_redemptions WHERE code_id = ? AND user_id = ?',
          [codeId, userId],
          (err, row) => {
            if (err) {
              console.error('Database error checking redemption:', err);
              db.run('ROLLBACK');
              reject(err);
              return;
            }
            
            if (row) {
              console.log(`❌ User ${userId} already redeemed code ${codeId}`);
              db.run('ROLLBACK');
              resolve(false);
              return;
            }

            db.run(
              'UPDATE codes SET used_slots = used_slots + 1 WHERE id = ? AND used_slots < max_slots',
              [codeId],
              function(err) {
                if (err) {
                  console.error('Database error updating code slots:', err);
                  db.run('ROLLBACK');
                  reject(err);
                  return;
                }
                
                if (this.changes === 0) {
                  console.log(`❌ Code ${codeId} is full or invalid`);
                  db.run('ROLLBACK');
                  reject(new Error('Code is full or invalid'));
                  return;
                }


                const redemptionId = Date.now().toString() + Math.random().toString(36).substr(2, 5);
                db.run(
                  'INSERT INTO code_redemptions (id, code_id, user_id, coins_earned) VALUES (?, ?, ?, ?)',
                  [redemptionId, codeId, userId, coinsEarned],
                  (err) => {
                    if (err) {
                      console.error('Database error creating redemption:', err);
                      db.run('ROLLBACK');
                      reject(err);
                    } else {
                      console.log(`✅ Code redeemed successfully: ${codeId} by ${userId} for ${coinsEarned} coins`);
                      db.run('COMMIT');
                      resolve(true);
                    }
                  }
                );
              }
            );
          }
        );
      });
    });
  }

  async deactivateOldCodes() {
    return new Promise((resolve, reject) => {
      const today = new Date().toDateString();
      this.db.run(
        'UPDATE codes SET is_active = 0 WHERE date_created != ? AND is_active = 1',
        [today],
        function(err) {
          if (err) {
            console.error('Database error in deactivateOldCodes:', err);
            reject(err);
          } else {
            if (this.changes > 0) {
              console.log(`🧹 Deactivated ${this.changes} old codes`);
            }
            resolve(this.changes);
          }
        }
      );
    });
  }

  async deactivateUnusedCodesAt7AM() {
    return new Promise((resolve, reject) => {
      this.db.run(
        'UPDATE codes SET is_active = 0 WHERE used_slots < max_slots AND is_active = 1',
        function(err) {
          if (err) {
            console.error('Database error in deactivateUnusedCodesAt7AM:', err);
            reject(err);
          } else {
            if (this.changes > 0) {
              console.log(`🕰️ Deactivated ${this.changes} unused codes at 7 AM`);
            }
            resolve(this.changes);
          }
        }
      );
    });
  }

  async setBotState(key, value) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT OR REPLACE INTO bot_state (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
        [key, value],
        function(err) {
          if (err) {
            console.error('Database error in setBotState:', err);
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }

  async getBotState(key) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT value FROM bot_state WHERE key = ?',
        [key],
        (err, row) => {
          if (err) {
            console.error('Database error in getBotState:', err);
            reject(err);
          } else {
            resolve(row ? row.value : null);
          }
        }
      );
    });
  }

  close() {
    if (this.db) {
      this.db.close((err) => {
        if (err) {
          console.error('Error closing database:', err);
        } else {
          console.log('📦 Database connection closed');
        }
      });
    }
  }
}

const db = new Database();
export { db };