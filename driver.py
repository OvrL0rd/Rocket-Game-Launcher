# ----------------------------------
#      File Name: Steam_Launcher_GUI.py
#           Date: 8/20/24
#    Description: This Program lists all games that is currently installed on the system. 
#                 Given the correct path. In a Graphical User Interface. In a nice manner.
#       Modified: 8/28/24
#  Modified Desc: Broke up the Class and it's dependencies into two separate modules.
#                 Project Structure is as follows:
#                 Rocket Game Launcher/
#                 │
#                 ├── driver.py                         # Main driver file.
#                 ├── Config/
#                 │   └── config.ini                    # Config file that is used to pull the game's from (provided by user).
#                 ├── Icons/
#                 │   └── All icons/images
#                 ├── Main_Window/
#                 │   ├── __init__.py                   # Needed for module practices.
#                 │   ├── Main_Window_Class.py          # Class definition for the Main Window.
#                 │   └── Class_Dependencies.py         # New module for Main Window's dependent functions.
#                 ├── Installer_Wizard.py               # Install Script for first setup of this program.
#                 └── Steam_Launcher.exe                # Executable program converted from 'pyinstaller' module.
# ---------------------------------------------------------------------------------------------------------------
# Import Statement(s)
# -------------------
import customtkinter as ctk                             # For more customization than Tkinter
from Main_Window.Main_Window_Class import Main_Window   # Import the class to create the window
# ---------------------------------------------------------------------------------------------
# Main Function
def main():
    root = ctk.CTk()    # Create root window
    Main_Window(root)   # Call the class to populate the root window
    root.mainloop()     # run the application in a loop

# Entry point of the program: this block ensures that the main() function is executed only when the script is run directly, not when imported as a module.
if __name__ == "__main__":
    main()