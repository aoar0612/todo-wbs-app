mod db;
mod commands;

use db::Database;
use std::sync::Arc;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize database
    let app_dir = dirs::data_dir()
        .unwrap_or_else(|| std::path::PathBuf::from("."))
        .join("todo-wbs-app");
    
    std::fs::create_dir_all(&app_dir).expect("Failed to create app data directory");
    
    let db_path = app_dir.join("data.db");
    let database = Database::new(db_path.to_str().unwrap())
        .expect("Failed to initialize database");
    
    let db_state = Arc::new(database);

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(db_state)
        .invoke_handler(tauri::generate_handler![
            commands::create_project,
            commands::get_all_projects,
            commands::get_project,
            commands::update_project,
            commands::delete_project,
            commands::create_task,
            commands::get_tasks_by_project,
            commands::update_task,
            commands::update_task_dates,
            commands::delete_task,
            commands::create_daily_todo,
            commands::get_todos_by_date,
            commands::toggle_todo,
            commands::update_todo_memo,
            commands::delete_todo,
            commands::add_task_to_todo,
            commands::generate_daily_report,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
