# ReadMe
## Rocket-Game-Launcher
A python GUI Launcher.

### Description
Rocket Game Launcher is a game launcher written in python using custom tkinter. This project is simple at the moment and launches any steam/epic game when given the correct manifests path. It also has support for multiple drives/install locations as well (up to 2 total drives at this time). Currently this program only works for windows machines (unless you want to edit the config file to work with linux).

### Usage
This program depends on the path you provide it. At the moment there are 2 steam paths (for multiple drives) and one for epic games (as epic handles it differently). Since both of these launchers handle app data differently the location of the two will be different. For Epic Games (as long as you downloaded the launcher in the default path) the path already set in the config file will be the correct one. This path works for multiple drives so you do not have to worry about setting multiple paths. For Steam it is a little different. The path where you have your games downloaded will be the path to set (the default one is already set in the config file). If you have other drives where you store your games then find the 'steamapps' folder in that drive and set it to that folder. As the program will be looking for the .acf files which contain the game data to display.

### Completed Features
- [x] Dark/Light Mode
- [x] Steam Support
- [x] Epic Games Support
- [x] Sorting Option
- [x] Settings Menu   

### Features In the Works
- [ ] Recently Used Game Sorting option
- [ ] Searching

### Future Features
- [ ] Battle.NET Support
- [ ] Xbox support
- [ ] Linux support?

### Credits & Resources
- https://icons8.com
- https://github.com/TomSchimansky/CustomTkinter
