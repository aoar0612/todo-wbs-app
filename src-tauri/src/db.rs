use rusqlite::{Connection, Result, params};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use chrono::Local;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Project {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Task {
    pub id: String,
    pub project_id: String,
    pub parent_id: Option<String>,
    pub title: String,
    pub description: Option<String>,
    pub status: String,
    pub priority: i32,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub progress: i32,
    pub order_index: i32,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DailyTodo {
    pub id: String,
    pub task_id: Option<String>,
    pub title: String,
    pub date: String,
    pub completed: bool,
    pub memo: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DailyTodoWithTask {
    pub id: String,
    pub task_id: Option<String>,
    pub title: String,
    pub date: String,
    pub completed: bool,
    pub memo: Option<String>,
    pub created_at: String,
    pub task_title: Option<String>,
    pub project_name: Option<String>,
}

pub struct Database {
    pub conn: Mutex<Connection>,
}

impl Database {
    pub fn new(db_path: &str) -> Result<Self> {
        let conn = Connection::open(db_path)?;
        let db = Database {
            conn: Mutex::new(conn),
        };
        db.init_schema()?;
        Ok(db)
    }

    fn init_schema(&self) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        
        conn.execute(
            "CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                start_date TEXT,
                end_date TEXT,
                created_at TEXT NOT NULL
            )",
            [],
        )?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS tasks (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                parent_id TEXT REFERENCES tasks(id) ON DELETE CASCADE,
                title TEXT NOT NULL,
                description TEXT,
                status TEXT DEFAULT 'pending',
                priority INTEGER DEFAULT 0,
                start_date TEXT,
                end_date TEXT,
                progress INTEGER DEFAULT 0,
                order_index INTEGER DEFAULT 0,
                created_at TEXT NOT NULL
            )",
            [],
        )?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS daily_todos (
                id TEXT PRIMARY KEY,
                task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
                title TEXT NOT NULL,
                date TEXT NOT NULL,
                completed INTEGER DEFAULT 0,
                memo TEXT,
                created_at TEXT NOT NULL
            )",
            [],
        )?;

        // Create indexes for better performance
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id)",
            [],
        )?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_tasks_parent_id ON tasks(parent_id)",
            [],
        )?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_daily_todos_date ON daily_todos(date)",
            [],
        )?;

        Ok(())
    }

    // Project CRUD operations
    pub fn create_project(&self, name: &str, description: Option<&str>, start_date: Option<&str>, end_date: Option<&str>) -> Result<Project> {
        let conn = self.conn.lock().unwrap();
        let id = Uuid::new_v4().to_string();
        let created_at = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

        conn.execute(
            "INSERT INTO projects (id, name, description, start_date, end_date, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![id, name, description, start_date, end_date, created_at],
        )?;

        Ok(Project {
            id,
            name: name.to_string(),
            description: description.map(|s| s.to_string()),
            start_date: start_date.map(|s| s.to_string()),
            end_date: end_date.map(|s| s.to_string()),
            created_at,
        })
    }

    pub fn get_all_projects(&self) -> Result<Vec<Project>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT id, name, description, start_date, end_date, created_at FROM projects ORDER BY created_at DESC")?;
        
        let projects = stmt.query_map([], |row| {
            Ok(Project {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                start_date: row.get(3)?,
                end_date: row.get(4)?,
                created_at: row.get(5)?,
            })
        })?.collect::<Result<Vec<_>>>()?;

        Ok(projects)
    }

    pub fn get_project(&self, id: &str) -> Result<Option<Project>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT id, name, description, start_date, end_date, created_at FROM projects WHERE id = ?1")?;
        
        let mut rows = stmt.query(params![id])?;
        if let Some(row) = rows.next()? {
            Ok(Some(Project {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                start_date: row.get(3)?,
                end_date: row.get(4)?,
                created_at: row.get(5)?,
            }))
        } else {
            Ok(None)
        }
    }

    pub fn update_project(&self, id: &str, name: &str, description: Option<&str>, start_date: Option<&str>, end_date: Option<&str>) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE projects SET name = ?1, description = ?2, start_date = ?3, end_date = ?4 WHERE id = ?5",
            params![name, description, start_date, end_date, id],
        )?;
        Ok(())
    }

    pub fn delete_project(&self, id: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM projects WHERE id = ?1", params![id])?;
        Ok(())
    }

    // Task CRUD operations
    pub fn create_task(&self, project_id: &str, parent_id: Option<&str>, title: &str, description: Option<&str>, status: &str, priority: i32, start_date: Option<&str>, end_date: Option<&str>) -> Result<Task> {
        let conn = self.conn.lock().unwrap();
        let id = Uuid::new_v4().to_string();
        let created_at = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
        
        // Get max order_index for the parent
        let order_index: i32 = conn.query_row(
            "SELECT COALESCE(MAX(order_index), -1) + 1 FROM tasks WHERE project_id = ?1 AND parent_id IS ?2",
            params![project_id, parent_id],
            |row| row.get(0),
        )?;

        conn.execute(
            "INSERT INTO tasks (id, project_id, parent_id, title, description, status, priority, start_date, end_date, progress, order_index, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 0, ?10, ?11)",
            params![id, project_id, parent_id, title, description, status, priority, start_date, end_date, order_index, created_at],
        )?;

        Ok(Task {
            id,
            project_id: project_id.to_string(),
            parent_id: parent_id.map(|s| s.to_string()),
            title: title.to_string(),
            description: description.map(|s| s.to_string()),
            status: status.to_string(),
            priority,
            start_date: start_date.map(|s| s.to_string()),
            end_date: end_date.map(|s| s.to_string()),
            progress: 0,
            order_index,
            created_at,
        })
    }

    pub fn get_tasks_by_project(&self, project_id: &str) -> Result<Vec<Task>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, project_id, parent_id, title, description, status, priority, start_date, end_date, progress, order_index, created_at FROM tasks WHERE project_id = ?1 ORDER BY order_index"
        )?;

        let tasks = stmt.query_map(params![project_id], |row| {
            Ok(Task {
                id: row.get(0)?,
                project_id: row.get(1)?,
                parent_id: row.get(2)?,
                title: row.get(3)?,
                description: row.get(4)?,
                status: row.get(5)?,
                priority: row.get(6)?,
                start_date: row.get(7)?,
                end_date: row.get(8)?,
                progress: row.get(9)?,
                order_index: row.get(10)?,
                created_at: row.get(11)?,
            })
        })?.collect::<Result<Vec<_>>>()?;

        Ok(tasks)
    }

    pub fn update_task(&self, id: &str, title: &str, description: Option<&str>, status: &str, priority: i32, start_date: Option<&str>, end_date: Option<&str>, progress: i32) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE tasks SET title = ?1, description = ?2, status = ?3, priority = ?4, start_date = ?5, end_date = ?6, progress = ?7 WHERE id = ?8",
            params![title, description, status, priority, start_date, end_date, progress, id],
        )?;
        Ok(())
    }

    pub fn update_task_dates(&self, id: &str, start_date: Option<&str>, end_date: Option<&str>) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE tasks SET start_date = ?1, end_date = ?2 WHERE id = ?3",
            params![start_date, end_date, id],
        )?;
        Ok(())
    }

    pub fn delete_task(&self, id: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM tasks WHERE id = ?1", params![id])?;
        Ok(())
    }

    // Daily TODO CRUD operations
    pub fn create_daily_todo(&self, task_id: Option<&str>, title: &str, date: &str, memo: Option<&str>) -> Result<DailyTodo> {
        let conn = self.conn.lock().unwrap();
        let id = Uuid::new_v4().to_string();
        let created_at = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

        conn.execute(
            "INSERT INTO daily_todos (id, task_id, title, date, completed, memo, created_at) VALUES (?1, ?2, ?3, ?4, 0, ?5, ?6)",
            params![id, task_id, title, date, memo, created_at],
        )?;

        Ok(DailyTodo {
            id,
            task_id: task_id.map(|s| s.to_string()),
            title: title.to_string(),
            date: date.to_string(),
            completed: false,
            memo: memo.map(|s| s.to_string()),
            created_at,
        })
    }

    pub fn get_todos_by_date(&self, date: &str) -> Result<Vec<DailyTodoWithTask>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT dt.id, dt.task_id, dt.title, dt.date, dt.completed, dt.memo, dt.created_at, t.title as task_title, p.name as project_name
             FROM daily_todos dt
             LEFT JOIN tasks t ON dt.task_id = t.id
             LEFT JOIN projects p ON t.project_id = p.id
             WHERE dt.date = ?1
             ORDER BY dt.completed, dt.created_at"
        )?;

        let todos = stmt.query_map(params![date], |row| {
            Ok(DailyTodoWithTask {
                id: row.get(0)?,
                task_id: row.get(1)?,
                title: row.get(2)?,
                date: row.get(3)?,
                completed: row.get::<_, i32>(4)? == 1,
                memo: row.get(5)?,
                created_at: row.get(6)?,
                task_title: row.get(7)?,
                project_name: row.get(8)?,
            })
        })?.collect::<Result<Vec<_>>>()?;

        Ok(todos)
    }

    pub fn toggle_todo(&self, id: &str) -> Result<bool> {
        let conn = self.conn.lock().unwrap();
        let current: i32 = conn.query_row(
            "SELECT completed FROM daily_todos WHERE id = ?1",
            params![id],
            |row| row.get(0),
        )?;
        let new_value = if current == 1 { 0 } else { 1 };
        conn.execute(
            "UPDATE daily_todos SET completed = ?1 WHERE id = ?2",
            params![new_value, id],
        )?;
        Ok(new_value == 1)
    }

    pub fn update_todo_memo(&self, id: &str, memo: Option<&str>) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE daily_todos SET memo = ?1 WHERE id = ?2",
            params![memo, id],
        )?;
        Ok(())
    }

    pub fn delete_todo(&self, id: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM daily_todos WHERE id = ?1", params![id])?;
        Ok(())
    }

    pub fn add_task_to_todo(&self, task_id: &str, date: &str) -> Result<DailyTodo> {
        let conn = self.conn.lock().unwrap();
        
        // Get task title
        let title: String = conn.query_row(
            "SELECT title FROM tasks WHERE id = ?1",
            params![task_id],
            |row| row.get(0),
        )?;

        drop(conn);
        
        self.create_daily_todo(Some(task_id), &title, date, None)
    }
}

