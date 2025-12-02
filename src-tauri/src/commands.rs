use crate::db::{Database, Project, Task, DailyTodo, DailyTodoWithTask};
use tauri::State;
use std::sync::Arc;

type DbState = Arc<Database>;

#[derive(Debug, serde::Serialize)]
pub struct CommandError {
    message: String,
}

impl From<rusqlite::Error> for CommandError {
    fn from(err: rusqlite::Error) -> Self {
        CommandError {
            message: err.to_string(),
        }
    }
}

// Project commands
#[tauri::command]
pub fn create_project(
    db: State<DbState>,
    name: String,
    description: Option<String>,
    start_date: Option<String>,
    end_date: Option<String>,
) -> Result<Project, CommandError> {
    db.create_project(
        &name,
        description.as_deref(),
        start_date.as_deref(),
        end_date.as_deref(),
    ).map_err(|e| e.into())
}

#[tauri::command]
pub fn get_all_projects(db: State<DbState>) -> Result<Vec<Project>, CommandError> {
    db.get_all_projects().map_err(|e| e.into())
}

#[tauri::command]
pub fn get_project(db: State<DbState>, id: String) -> Result<Option<Project>, CommandError> {
    db.get_project(&id).map_err(|e| e.into())
}

#[tauri::command]
pub fn update_project(
    db: State<DbState>,
    id: String,
    name: String,
    description: Option<String>,
    start_date: Option<String>,
    end_date: Option<String>,
) -> Result<(), CommandError> {
    db.update_project(
        &id,
        &name,
        description.as_deref(),
        start_date.as_deref(),
        end_date.as_deref(),
    ).map_err(|e| e.into())
}

#[tauri::command]
pub fn delete_project(db: State<DbState>, id: String) -> Result<(), CommandError> {
    db.delete_project(&id).map_err(|e| e.into())
}

// Task commands
#[tauri::command]
pub fn create_task(
    db: State<DbState>,
    project_id: String,
    parent_id: Option<String>,
    title: String,
    description: Option<String>,
    status: String,
    priority: i32,
    start_date: Option<String>,
    end_date: Option<String>,
) -> Result<Task, CommandError> {
    db.create_task(
        &project_id,
        parent_id.as_deref(),
        &title,
        description.as_deref(),
        &status,
        priority,
        start_date.as_deref(),
        end_date.as_deref(),
    ).map_err(|e| e.into())
}

#[tauri::command]
pub fn get_tasks_by_project(db: State<DbState>, project_id: String) -> Result<Vec<Task>, CommandError> {
    db.get_tasks_by_project(&project_id).map_err(|e| e.into())
}

#[tauri::command]
pub fn update_task(
    db: State<DbState>,
    id: String,
    title: String,
    description: Option<String>,
    status: String,
    priority: i32,
    start_date: Option<String>,
    end_date: Option<String>,
    progress: i32,
) -> Result<(), CommandError> {
    db.update_task(
        &id,
        &title,
        description.as_deref(),
        &status,
        priority,
        start_date.as_deref(),
        end_date.as_deref(),
        progress,
    ).map_err(|e| e.into())
}

#[tauri::command]
pub fn update_task_dates(
    db: State<DbState>,
    id: String,
    start_date: Option<String>,
    end_date: Option<String>,
) -> Result<(), CommandError> {
    db.update_task_dates(&id, start_date.as_deref(), end_date.as_deref()).map_err(|e| e.into())
}

#[tauri::command]
pub fn delete_task(db: State<DbState>, id: String) -> Result<(), CommandError> {
    db.delete_task(&id).map_err(|e| e.into())
}

// Daily TODO commands
#[tauri::command]
pub fn create_daily_todo(
    db: State<DbState>,
    task_id: Option<String>,
    title: String,
    date: String,
    memo: Option<String>,
) -> Result<DailyTodo, CommandError> {
    db.create_daily_todo(
        task_id.as_deref(),
        &title,
        &date,
        memo.as_deref(),
    ).map_err(|e| e.into())
}

#[tauri::command]
pub fn get_todos_by_date(db: State<DbState>, date: String) -> Result<Vec<DailyTodoWithTask>, CommandError> {
    db.get_todos_by_date(&date).map_err(|e| e.into())
}

#[tauri::command]
pub fn toggle_todo(db: State<DbState>, id: String) -> Result<bool, CommandError> {
    db.toggle_todo(&id).map_err(|e| e.into())
}

#[tauri::command]
pub fn update_todo_memo(db: State<DbState>, id: String, memo: Option<String>) -> Result<(), CommandError> {
    db.update_todo_memo(&id, memo.as_deref()).map_err(|e| e.into())
}

#[tauri::command]
pub fn delete_todo(db: State<DbState>, id: String) -> Result<(), CommandError> {
    db.delete_todo(&id).map_err(|e| e.into())
}

#[tauri::command]
pub fn add_task_to_todo(db: State<DbState>, task_id: String, date: String) -> Result<DailyTodo, CommandError> {
    db.add_task_to_todo(&task_id, &date).map_err(|e| e.into())
}

// Export daily report as markdown
#[tauri::command]
pub fn generate_daily_report(db: State<DbState>, date: String, memo: String) -> Result<String, CommandError> {
    let todos = db.get_todos_by_date(&date)?;
    
    let completed: Vec<_> = todos.iter().filter(|t| t.completed).collect();
    let incomplete: Vec<_> = todos.iter().filter(|t| !t.completed).collect();
    
    let mut report = format!("# 日報 - {}\n\n", date);
    
    report.push_str("## 完了したタスク\n");
    if completed.is_empty() {
        report.push_str("なし\n");
    } else {
        for todo in completed {
            let prefix = if let Some(ref project) = todo.project_name {
                format!("{}: ", project)
            } else {
                String::new()
            };
            report.push_str(&format!("- [x] {}{}\n", prefix, todo.title));
            if let Some(ref m) = todo.memo {
                if !m.is_empty() {
                    report.push_str(&format!("  - {}\n", m));
                }
            }
        }
    }
    
    report.push_str("\n## 未完了のタスク\n");
    if incomplete.is_empty() {
        report.push_str("なし\n");
    } else {
        for todo in incomplete {
            let prefix = if let Some(ref project) = todo.project_name {
                format!("{}: ", project)
            } else {
                String::new()
            };
            report.push_str(&format!("- [ ] {}{}\n", prefix, todo.title));
        }
    }
    
    if !memo.is_empty() {
        report.push_str(&format!("\n## メモ\n{}\n", memo));
    }
    
    Ok(report)
}

