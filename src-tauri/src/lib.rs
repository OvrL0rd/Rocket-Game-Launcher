use std::process::Child;
use std::sync::Mutex;
use tauri::{Manager, State};

struct BackendProcess(Mutex<Option<Child>>);

#[tauri::command]
fn get_backend_port(port: State<u16>) -> u16 {
    *port
}

pub fn run() {
    let port = portpicker::pick_unused_port().expect("failed to find unused port");

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(port)
        .manage(BackendProcess(Mutex::new(None)))
        .setup(move |app| {
            let resource_path = app
                .path()
                .resource_dir()
                .expect("failed to get resource dir");

            let backend_path = resource_path.join("backend").join("main.py");

            let child = std::process::Command::new("python3")
                .arg(backend_path)
                .arg("--port")
                .arg(port.to_string())
                .spawn()
                .expect("failed to start Python backend");

            *app.state::<BackendProcess>().0.lock().unwrap() = Some(child);

            // Give the backend a moment to bind
            std::thread::sleep(std::time::Duration::from_millis(500));

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                if let Some(mut child) = window
                    .state::<BackendProcess>()
                    .0
                    .lock()
                    .unwrap()
                    .take()
                {
                    let _ = child.kill();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![get_backend_port])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
