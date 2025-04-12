# ReadMe
## Rocket-Game-Launcher
A GUI application written in python.

### Description
Rocket Game Launcher is a simple easy to use GUI interface written with customtkiner python. This project is very simple at the moment and launches any steam game when given the correct appmanifests file path. It also has support for multiple drives/install locations as well.

### Usage
This program's main dependency is the path you provide to it (currently it defaults to steam's default path). The program will list what is in that folder you specifiy (given it is the correct file type). The folder location depends on your steam install location but for most systems it would be 'C:\Program Files (x86)\Steam\steamapps\'. The files there are '.acf' files which are the manifest files the program parses and lists your games. For other installations to a seperate drive you would have to know where that path is and locate those .acf files then input that path to the program. I have not tested this on linux so I can't say 100% that it works as intended.

### Features
- [x] Simple GUI/Settings
- [x] Dark/Light Mode
- [x] Steam Support
- [ ] Epic Games Support
- [ ] Heroic Launcher Support
- [ ] Linux support

### Credits & Resources
- [icons8.com]("https://icons8.com)
- [CustomTkinter]("https://github.com/TomSchimansky/CustomTkinter")
