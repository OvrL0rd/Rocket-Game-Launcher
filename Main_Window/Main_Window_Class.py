# ----------------------------------
#      File Name: Main_Window_Class.py
#           Date: 8/28/24
#    Description: This is the class 'Main_Window' implementation. Originally in 'driver.py'.
#                 This class has all the functions pertaining creating/destroying/manipulating the GUI.
#                 
#           Note: Currently as of v2.0 only Steam is supported at the moment.
#                 Epic Games, Battle.NET, and possibly Xbox will be next.
# -----------------------------------------------------------------------
# Import Statement(s)
# -------------------
# Tkinter Import Statement(s)
import tkinter as tk                                                # For creating and managing GUI window(s)
import customtkinter as ctk                                         # For more customization than Tkinter
from tkinter import messagebox, StringVar                           # For displaying message boxes and handling string vars in Tkinter
from tkinter import filedialog                                      # For opening file dialogs to select files/dirs
# -----------------
# Image Import Statement(s)
from PIL import Image, ImageTk                                      # For image processing, manipulation, and rendering in Tkinter
# -----------------
# Misc Statement(s)
import os                                                           # For interacting with the current operating sys
import sys                                                          # For accessing system-specific functions
import winreg                                                       # For accessing and modifying Windows registry
from collections import OrderedDict                                 # For sorting dictionary
from ctypes import windll, byref, sizeof, c_int                     # To change the title bar color

# Import Steam_Launcher functions
from .Class_Dependencies import *                                   # Import all functions/methods from the 'Class_Dependencies.py' file


# Main Window Class
#
class Main_Window:
    def __init__(self, root):
        self.root = root # set
        root.title("Rocket Game Launcher") # Define the Name of window
        root.geometry("1325x900") # Define the size of the window
        
        # Set the scrollable height of the window
        window_height = self.root.winfo_height()
        self.scrollable_height = int(0.75 * window_height)

        self.color = None # Set color(dark/light mode)
        theme = self.get_windows_theme() # Get window's current theme and set self.color to it
        
        # Set the dark/light mode title bar colors
        self.light_bar_color = 0x00dbdbdb
        self.dark_bar_color = 0x002b2b2b

        self.HWND = windll.user32.GetParent(root.winfo_id())

        if theme == "light": # Set the title bar color to light mode
            # Set Title bar color
            title_bar_color = self.light_bar_color # This is the inverted color of what is shown on the screen when run. For some reason.
            windll.dwmapi.DwmSetWindowAttribute(self.HWND,35,byref(c_int(title_bar_color)), sizeof(c_int))
        elif theme == "dark": # Set the title bar color to dark mode
            # Set Title bar color
            self.title_bar_color = self.dark_bar_color # This is the inverted color of what is shown on the screen when run. For some reason.
            windll.dwmapi.DwmSetWindowAttribute(self.HWND,35,byref(c_int(self.title_bar_color)), sizeof(c_int))

        # Create path to the icon file from this path. Then set the icon for the window
        self.current_dir = os.path.dirname(os.path.abspath(sys.argv[0])) # Get current working dir.
        self.icon_path = os.path.join(self.current_dir, 'Icons', 'Main-Launcher-Icon.ico') # Join '/Icons/Main-Launcher-Icon.ico' after the current dir so it will work wherever the project is placed.
        root.iconbitmap(self.icon_path) # Now set the custom icon using the path made above.
        
        # read config and set vars
        self.config_path = os.path.join(self.current_dir, 'Config', 'config.ini')
        path = read_config_file(self.config_path)
        
        # Retrieve the API key from the environment variable
        load_dotenv()
        self.api_key = os.getenv('GIANT_BOMB_API_KEY') # Set the API key to a global variable

        # Set global launcher paths and executables to the value in the config file
        self.steam_path1_current = path["Steam"]["path1"]
        self.steam_path2_current = path["Steam"]["path2"]
        self.steam_executable_current = path["Steam"]["executable"]

        self.epic_path1_current = path["Epic Games"]["path1"]
        self.epic_executable_current = path["Epic Games"]["executable"]

        # This is for future implementation of Epic Games, Battle.NET, and Xbox
        #battle_path1_current = path["Battle.NET"]["path1"]
        #battle_path2_current = path["Battle.NET"]["path2"]
        #self.battle_executable_path = path["Battle.NET"]["executable"]
        #xbox_path1_current = path["Xbox"]["path1"]
        #xbox_path2_current = path["Xbox"]["path2"]
        #self.xbox_executable_path = path["Xbox"]["executable"]

        # Create stringvar for UI
        self.steam_path1 = StringVar()
        self.steam_path2 = StringVar()
        self.steam_exe = StringVar()

        self.epic_path1 = StringVar()
        self.epic_exe = StringVar()
        
        # This is for future implementation of Epic Games, Battle.NET, and Xbox
        #self.battle_path1 = StringVar()
        #self.battle_path2 = StringVar()
        #self.battle_exe = StringVar()
        #self.xbox_path1 = StringVar()
        #self.xbox_path2 = StringVar()
        #self.xbox_exe = StringVar()

        # set stringvar equal to read in vars
        self.steam_path1.set(self.steam_path1_current)
        self.steam_path2.set(self.steam_path2_current)
        self.steam_exe.set(self.steam_executable_current)

        # This is for future implementation of Epic Games, Battle.NET, and Xbox
        self.epic_path1.set(self.epic_path1_current)
        self.epic_exe.set(self.epic_executable_current)
        
        #self.battle_path1.set(battle_path1_current)
        #self.battle_path2.set(battle_path2_current)
        
        #self.xbox_path1.set(xbox_path1_current)
        #self.xbox_path2.set(xbox_path2_current)
        
        # Create arrays to store games in
        self.paths_dict = None
        self.steam_games = {}
        self.epic_games = {}

        self.Update_Steam = False
        self.Update_Epic = False

        self.create_dashboard()

    # Function to load the config file to use for the Listbox of Games.
    def load_config(self):
        print(f"Reading in data from config file...")
        paths_data = read_config_file(self.config_path)
        section_vars = create_section_vars(paths_data)
        self.paths_dict = store_path_vars(section_vars)

        # Add games to array from Steam games
        steam_paths = self.paths_dict['Steam']
        if steam_paths['path1']:
            try:
                self.steam_games.update(get_steam_games(steam_paths['path1']))
            except ValueError as val_err:
                val_err = "[Value Error] dictionary update sequence element #0 has length 1; 2 is required"
                messagebox.showerror("Error", val_err)

        if steam_paths['path2']:
            try:
                self.steam_games.update(get_steam_games(steam_paths['path2']))
            except ValueError as val_err:
                val_err = "[Value Error] dictionary update sequence element #0 has length 1; 2 is required"
                messagebox.showerror("Error", val_err)

        if not steam_paths['path1'] and not steam_paths['path2']: # Clear the array if there is nothing in the config for Steam
            self.steam_games.clear() 

        # Add games to array from Epic games
        epic_paths = self.paths_dict['Epic Games']
        launcher_executable_path = self.paths_dict['Epic Games']['executable']

        if epic_paths['path1']:
            try:
                self.epic_games.update(get_epic_games(epic_paths['path1'], launcher_executable_path))
            except ValueError as val_err:
                val_err = "[Value Error] dictionary update sequence element #0 has length 1; 2 is required"
                messagebox.showerror("Error", val_err)
        
        if not epic_paths['path1']: # Clear the array if there is nothing in the config for Epic Games
            self.epic_games.clear()

    def get_windows_theme(self): # returns window's current theme and sets self.color to it and returns it 
        # Path to the registry key
        registry_path = r"Software\Microsoft\Windows\CurrentVersion\Themes\Personalize"
        # Registry value name
        value_name = "AppsUseLightTheme"

        try:
            # Open the registry key
            registry_key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, registry_path)
            # Read the value
            value, _ = winreg.QueryValueEx(registry_key, value_name)
            winreg.CloseKey(registry_key)

            # Determine theme based on the registry value
            if value == 1:
                self.color = "light"
                return self.color
            else:
                self.color = "dark"
                return self.color

        except Exception as e:
            print(f"Error accessing the registry: {e}")
            return None
        

# -----------------------------------------------------------------------------------------
    # Creates the main dashboard that you see on start up
    def create_dashboard(self):
        self.Kill_All_Widgets() # Kill all widgets on the current screen
        self.create_menu_bar() # Create the top menu bar
        # Create Steam Portion of the dashboard

        # Create scrollable frame
        self.scrollable_frame = ctk.CTkScrollableFrame(self.root,
                                            fg_color='transparent',
                                            orientation="vertical"
                                                       )
        self.scrollable_frame.pack(fill="both",
                                   pady=(0,0), 
                                   expand=True, 
                                   ipady=self.scrollable_height)

        # Steam Text
        text_frame = ctk.CTkFrame(self.scrollable_frame,
                                  fg_color= 'transparent'
                                  )
        text_frame.pack(padx=5,
                        pady=(0, 5),
                        fill="x"
                        )

        steam_text = ctk.CTkLabel(text_frame,
                                  text="Steam Games",
                                  font=("Ariel", 30, "bold")
                                  )
        steam_text.pack(anchor="nw",
                        pady=(5,10),
                        padx=(20,0)
                       )

        self.create_steam_games_list()

        # Epic Games Text
        text_frame = ctk.CTkFrame(self.scrollable_frame,
                                  fg_color= 'transparent'
                                  )
        text_frame.pack(padx=5,
                        pady=(10, 5),
                        fill="x"
                        )

        epic_text = ctk.CTkLabel(text_frame,
                                  text="Epic Games",
                                  font=("Ariel", 30, "bold")
                                  )
        epic_text.pack(anchor="nw",
                        pady=(5,10),
                        padx=(20,0)
                       )

        self.create_epic_games_list()

# -----------------------------------------------------------------------------------------
    def create_menu_bar(self):
        frame = ctk.CTkFrame(self.root,
                            corner_radius= 0
                            )
        frame.pack(fill="x")

        # Create Launcher Icon and title
        title = ctk.CTkLabel(frame, 
                            text="Home",
                            font=("Ariel", 27, "bold"),
                            padx=20,
                            pady=10
                            )
        title.pack(side="left")

        # Create settings button
        if self.color == "dark":
            settings_icon_path = os.path.join(self.current_dir, 'Icons', 'Settings-Gear-light.png') # Create full path of image
            
        elif self.color == "light":
            settings_icon_path = os.path.join(self.current_dir, 'Icons', 'Settings-Gear-dark.png') # Create full path of image

        settings_image = Image.open(settings_icon_path)
        settings_icon = ctk.CTkImage(settings_image)
        settings = ctk.CTkButton(frame,
                                 image=settings_icon,
                                 width=5,
                                 height=5,
                                 text="",
                                 fg_color='transparent',
                                 hover=False,
                                 command=self.Show_Settings_Menu
                                )
        
        settings.pack(side="right", anchor="e", padx=(0,10))

        # Create mode toggle button
        if self.color == "dark":
            mode_icon_path = os.path.join(self.current_dir, 'Icons', 'Switch-Mode-light.png') # Create full path of image
        elif self.color == "light":
            mode_icon_path = os.path.join(self.current_dir, 'Icons', 'Switch-Mode-dark.png') # Create full path of image
        
        mode_image = Image.open(mode_icon_path)
        mode_icon = ctk.CTkImage(mode_image)
        toggle_mode = ctk.CTkButton(frame,
                                    image=mode_icon,
                                    width=5,
                                    height=5,
                                    text="",
                                    fg_color='transparent',
                                    hover=False,
                                    command=self.Toggle_Mode
                                    )
        toggle_mode.pack(side="right", anchor="e", padx=(0,5))


    def create_epic_games_list(self):
        self.epic_games_frame = ctk.CTkScrollableFrame(self.scrollable_frame, 
                                                  orientation="horizontal",
                                                  #fg_color = 'transparent',
                                                  height = 465
                                   )
        self.epic_games_frame.pack(padx=5,
                              pady=(0,5),
                              fill="both",
                              expand=True
                        )
        
        counter = 0
        # Loop over the games in the library and run function to get photos (NOT IMPLEMENTED YET)
        for name, game_info in self.epic_games.items(): # Print items in epic games array
            game_exe_path = game_info['Executable']
            launcher_exe_path = game_info['Launcher Executable']
            # print(f"Game path for {name}: {game_exe_path} and launcher path is: {launcher_exe_path}")
            self.create_epic_games_button(name, game_exe_path, launcher_exe_path, counter)
            counter += 1
        else:
            if counter == 0:
                print("No games found in Steam AppManifest. Calling placeholder function...")
                if self.epic_games_frame.winfo_exists(): 
                    self.epic_games_frame.pack_forget() # Destroy the scrollable frame and replace with a non scrollable one to present the text
                    print("Games Frame Destroyed!")
                else:
                    print("Games Frame doesn't exist.")
                self.epic_game_placeholder_text()
        
    # -----------------------------------------------------------------------------------------
    def epic_game_placeholder_text(self):
        if self.color == 'dark':
            # current_text_color = "#dce4ee"
            current_text_color = "#777777"
        elif self.color == 'light':
            current_text_color = "#1a1a1a"
        
        self.epic_game_frame = ctk.CTkFrame(self.scrollable_frame,
                                        height=100
                                        )
        self.epic_game_frame.pack(padx=5,
                         fill="both",
                         expand=True
                        )
        

        placeholder_label = ctk.CTkLabel(self.epic_game_frame,
                                         text="No Games Found",
                                         text_color=current_text_color,
                                         font=("Ariel", 20, "normal")
                                        )
        placeholder_label.pack(side="top",
                               pady=20,
                               padx=(50,0),
                               expand=True
                               )


    # -----------------------------------------------------------------------------------------
    def create_epic_games_button(self, game_name, game_path, launcher_path, iteration):
        
        
        # Store the path to the play button image
        play_button_path = os.path.join(self.current_dir, 'Icons', 'Play-Button-light.png')

        # Open the play button image
        open_image = Image.open(play_button_path)
        play_button_image = ctk.CTkImage(open_image)

        game_title = game_name
        epic_game_image = grab_epic_game_photo(self.api_key, game_title)

        if epic_game_image == None:
            epic_game_image = Image.open(os.path.join(self.current_dir, 'Icons', 'Placeholder_Image.jpg')) # Set the image to the placeholder since the API couldn't get the photo
        else:    
            # Load and process the image
            game_image_resize = epic_game_image.resize((300, 450))
            blurred_game_photo = add_blur_gradient(game_image_resize, 10, 0.2)  # Adjust blur effect and height ratio
            rounded_blurred_image = add_rounded_corners(blurred_game_photo, 10)  # Adjust radius of photo here
            game_image = ImageTk.PhotoImage(rounded_blurred_image)

        # Create a CTkCanvas to overlay the button on the image
        if self.color == 'dark':
            current_background_color = "#2b2b2b"
        elif self.color == 'light':
            current_background_color = "#dbdbdb"
        canvas = ctk.CTkCanvas(self.epic_games_frame, width=300, height=450, bg=current_background_color, highlightthickness=0)
        canvas.image = game_image # Keep reference
        canvas.create_image(0, 0, anchor='nw', image=game_image) # Add the image to the canvas
        canvas.grid(row=0, column=iteration, padx=10, pady=(10, 10))

        # Add the play button on top of the image
        epic_play_button = ctk.CTkButton(
            canvas,
            text="Play",
            image=play_button_image,
            font=("Ariel", 16, "bold"),
            fg_color="transparent",
            bg_color= '#059212',
            text_color="white",
            width=135,
            height=50,
            hover_color="#06D001",
            corner_radius=0,
            border_width=0,
            anchor="center",
            command=lambda:launch_epic_game(game_path, game_name, launcher_path)
        )

        # Set button padding
        padding_x = 10
        button_x = (300 - padding_x) / 2  # Center button with padding
        button_y = 400  # Position button near the bottom of the canvas

        # Place the button on the canvas with padding
        canvas.create_window(button_x, button_y, window=epic_play_button)





# -----------------------------------------------------------------------------------------
    def create_steam_games_list(self):
        # Array of Games
        self.steam_games_frame = ctk.CTkScrollableFrame(self.scrollable_frame, 
                                                  orientation="horizontal",
                                                  #fg_color = 'transparent',
                                                  height = 465
                                   )
        self.steam_games_frame.pack(padx=5,
                         fill="both",
                         expand=True
                        )

        

        # Create button on the frame and fill it with the steam game
        
        # Array of Game names and App ids sperately taken from self.steam_games array
        game_names = []
        app_ids = []

        self.load_config() # run function that returns dictionary of steam games ex: '{'Garrys Mod': '4000'}'
        
        # Sort the Dictionary by A-Z
        # print(f"Load config returns Steam (UNSORTED): '{self.steam_games}'")
        self.steam_games = OrderedDict(sorted(self.steam_games.items()))
        print()
        print(f"Sorted Steam Games Dictionary: '{self.steam_games}'")
        # print(f"Load config returns Epic (UNSORTED): {self.epic_games}")
        self.epic_games = OrderedDict(sorted(self.epic_games.items()))
        print()
        print(f"Sorted Epic Games Dictionary: {self.epic_games}")
        
        # Process each config string
        for config_string in self.steam_games:
            # Extract the game name and app ID
            for game_name, app_id in self.steam_games.items():
                game_names.append(game_name)
                app_ids.append(app_id)

        # print("Game Names:", game_names)  
        # print("App IDs:", app_ids)

        # C:\Program Files (x86)\Steam\appcache\librarycache (This is steam's logos folder path)
        # print (f"Steam exe path var: {steam_logo_path}")
        # Example of photo name of logo
        # 4000_library_600x900.jpg

        steam_exe_path = self.steam_exe.get() # Store the exe path in var to manipulate
        steam_logo_path = steam_exe_path.replace('steam.exe', 'appcache\\librarycache\\') # var that stores the icon cache of all photos
        
        logo_600x900 = "_library_600x900.jpg" # last half of the jpg file that is the same
        counter = 0
        for game_name, app_id in self.steam_games.items():
            
            app_id_logo_path = steam_logo_path + app_id + logo_600x900 # Path to game's logo
            # print(f"Calling Function 'Create Steam Button' with {app_id_logo_path} as logo and {game_name} as game")
            self.create_steam_game_button(app_id_logo_path, game_name, app_id, counter) # Function call to create steam game button
            counter = counter + 1
        else:
            if counter == 0:
                print("No games found in Steam AppManifest. Calling placeholder function...")
                if self.steam_games_frame.winfo_exists(): 
                    self.steam_games_frame.pack_forget() # Destroy the scrollable frame and replace with a non scrollable one to present the text
                    print("Games Frame Destroyed!")
                else:
                    print("Games Frame doesn't exist.")
                self.steam_game_placeholder_text()

                


# -----------------------------------------------------------------------------------------
    def steam_game_placeholder_text(self):
        if self.color == 'dark':
            # current_text_color = "#dce4ee"
            current_text_color = "#777777"
        elif self.color == 'light':
            current_text_color = "#1a1a1a"
        
        self.steam_game_frame = ctk.CTkFrame(self.scrollable_frame,
                                        height=100
                                        )
        self.steam_game_frame.pack(padx=5,
                         fill="both",
                         expand=True
                        )
        

        placeholder_label = ctk.CTkLabel(self.steam_game_frame,
                                         text="No Games Found",
                                         text_color=current_text_color,
                                         font=("Ariel", 20, "normal")
                                        )
        placeholder_label.pack(side="top",
                               pady=20,
                               padx=(50,0),
                               expand=True
                               )
        
        
        
        

# -----------------------------------------------------------------------------------------    
    def create_steam_game_button(self, logo_path, game_name, app_id, iteration):
        # Store the path to the play button image
        play_button_path = os.path.join(self.current_dir, 'Icons', 'Play-Button-light.png')

        # Open the play button image
        open_image = Image.open(play_button_path)
        play_button_image = ctk.CTkImage(open_image)

        # Load and process the image
        game_image_open = Image.open(logo_path)
        game_image_resize = game_image_open.resize((300, 450))
        blurred_game_photo = add_blur_gradient(game_image_resize, 10, 0.2)  # Adjust blur effect and height ratio
        rounded_blurred_image = add_rounded_corners(blurred_game_photo, 10) # Adjust radius of photo here
        game_image = ImageTk.PhotoImage(rounded_blurred_image)

        # Create a CTkCanvas to overlay the button on the image
        if self.color == 'dark':
            current_background_color = "#2b2b2b"
        elif self.color == 'light':
            current_background_color = "#dbdbdb"
        canvas = ctk.CTkCanvas(self.steam_games_frame, width=300, height=450, bg=current_background_color, highlightthickness=0)
        canvas.image = game_image # Keep reference
        canvas.create_image(0, 0, anchor='nw', image=game_image) # Add the image to the canvas
        canvas.grid(row=0, column=iteration, padx=10, pady=(10, 10))

        # Add Game Name above the button
        # steam_game_text = ctk.CTkLabel(
        #     canvas,
        #     text="Play",

        # )

        # Add the play button on top of the image
        steam_play_button = ctk.CTkButton(
            canvas,
            text="Play",
            image=play_button_image,
            font=("Ariel", 16, "bold"),
            fg_color="transparent",
            bg_color= '#059212',
            text_color="white",
            width=135,
            height=50,
            hover_color="#06D001",
            corner_radius=0,
            border_width=0,
            anchor="center",
            command=lambda:launch_steam_game(app_id, self.steam_executable_current, game_name)
        )

        # Set button padding
        padding_x = 10
        button_x = (300 - padding_x) / 2  # Center button with padding
        button_y = 400  # Position button near the bottom of the canvas

        # Place the button on the canvas with padding
        canvas.create_window(button_x, button_y, window=steam_play_button)


# -----------------------------------------------------------------------------------------
    def Show_Settings_Menu(self): # This function should wipe all widgets on screen and then show the settings menu
        print("Settings Menu!")
        #self.Kill_All_Widgets() # Kill all widgets on the current screen
        self.Create_Settings_Widgets() # Creates settings widgets
        
    def refresh_launchers(self):
        self.settings_Window.destroy()
        if self.Update_Steam == True or self.Update_Epic == True:
            self.Update_Steam = False
            self.Update_Epic = False
            self.Kill_All_Widgets()
            self.create_dashboard()
        else:
            return None

# -----------------------------------------------------------------------------------------
    def Create_Settings_Widgets(self):
        self.settings_Window = ctk.CTkToplevel(self.root,
                                               
                                               )

        self.settings_Window.geometry("800x500")
        self.settings_Window.title("Settings")
        
        self.settings_Window.iconbitmap(self.icon_path) # Now set the custom icon using the path made above.
        

        self.Settings_Menu_Bar()
        # Implement the rest of the settings menu here
        
        # Create scrollable frame
        self.settings_frame = ctk.CTkFrame(self.settings_Window,
                                                       fg_color='transparent'
                                                       )
        self.settings_frame.pack(fill="both",
                                   pady=(20,0), 
                                   expand=True, 
                                   ipady=self.scrollable_height
                                  )
        
        self.load_steam_settings() # Load UI for steam path settings
        self.load_epic_games_settings() # Load UI for epic path settings
        popup_hwnd = windll.user32.GetParent(self.settings_Window.winfo_id())
        self.Set_Title_Bar(popup_hwnd)
        self.settings_Window.attributes('-topmost', True)
        self.settings_Window.protocol("WM_DELETE_WINDOW", self.refresh_launchers)
        
# -----------------------------------------------------------------------------------------
    def load_steam_settings(self):
        # Create settings frame
        steam_settings_frame = ctk.CTkFrame(self.settings_frame,
                             #fg_color = 'transparent',
                             )
        steam_settings_frame.pack(padx=5,
                                pady=(0,5),
                                fill="x",
                                expand=True
                                )
        # Create Steam Label
        steam_text = ctk.CTkLabel(steam_settings_frame,
                                  text="Steam Manifests Path(s)",
                                  font=("Ariel", 20, "bold")
                                  )
        steam_text.pack(anchor="w",
                        padx=(40,0),
                        pady=(10,0)
                        )

        # Create path frames
        steam_entry1_frame = ctk.CTkFrame(steam_settings_frame)
        steam_entry1_frame.pack(fill="both", pady=10, padx=10)

        steam_p1_text = ctk.CTkLabel(steam_entry1_frame,
                                  text="Path 1",
                                  font=("Ariel", 20, "bold")
                                  )
        steam_p1_text.pack(anchor=tk.W,
                        padx=(40,0),
                        pady=(10,0)
                        )
        
        # Create Steam Path entry boxes
        # Steam entry 1
        steam_path1_entry = ctk.CTkEntry(steam_entry1_frame,
                                         width=300,
                                         state="readonly",
                                         textvariable=self.steam_path1
                                         )
        
        steam_path1_entry.pack(pady=(10,10),
                               padx=(40,0),
                               side="left"
                               )
        
        steam_path1_clear_button = ctk.CTkButton(steam_entry1_frame,
                                                text="Clear",
                                                command=lambda:self.clear_file(1),
                                                width=100)
        steam_path1_clear_button.pack(padx=(0,10),
                                     side="right",
                                     )

        steam_path1_button = ctk.CTkButton(steam_entry1_frame,
                                         text="Browse",
                                         command=lambda:self.browse_file(1),
                                         width=100
                                         )
        
        steam_path1_button.pack(padx=(0,10),
                               side="right"
                               )
        
        # Steam entry 2 frame
        steam_entry2_frame = ctk.CTkFrame(steam_settings_frame)
        steam_entry2_frame.pack(fill="both", pady=10, padx=10)

        steam_p2_text = ctk.CTkLabel(steam_entry2_frame,
                                  text="Path 2",
                                  font=("Ariel", 20, "bold")
                                  )
        steam_p2_text.pack(anchor=tk.W,
                            padx=(40,0),
                            pady=(10,0)
                            )

        # Steam entry 2
        steam_path2_entry = ctk.CTkEntry(steam_entry2_frame,
                                         width=300,
                                         state="readonly",
                                         textvariable=self.steam_path2
                                         )
        
        steam_path2_entry.pack(pady=(10,10),
                               padx=(40,0),
                               side="left"
                               )

        steam_path2_clear_button = ctk.CTkButton(steam_entry2_frame,
                                                text="Clear",
                                                command=lambda:self.clear_file(2),
                                                width=100)
        steam_path2_clear_button.pack(padx=(0,10),
                                     side="right",
                                     )

        steam_path2_button = ctk.CTkButton(steam_entry2_frame,
                                         text="Browse",
                                         command=lambda:self.browse_file(2),
                                         width=100
                                         )
        
        steam_path2_button.pack(padx=(0,10),
                               side="right"
                               )
        
# -----------------------------------------------------------------------------------------
    def load_epic_games_settings(self):
        epic_games_settings_frame = ctk.CTkFrame(self.settings_frame,
                                                 #fg_color = 'transparent',
                                                 )
        
        epic_games_settings_frame.pack(padx=5,
                                       pady=(5,0),
                                       fill="x",
                                       expand=True
                                       )
        
        # Create Epic Games label
        epic_text = ctk.CTkLabel(epic_games_settings_frame,
                                 text="Epic Games Manifest Path",
                                 font=("Ariel", 20, "bold")
                                 )
        epic_text.pack(anchor="w",
                       padx=(40,0),
                       pady=(10,0)
                       )
        
        # Create path frames
        epic_entry1_frame = ctk.CTkFrame(epic_games_settings_frame)
        epic_entry1_frame.pack(fill="both", pady=10, padx=10)

        epic_p1_text = ctk.CTkLabel(epic_entry1_frame,
                                  text="Path 1",
                                  font=("Ariel", 20, "bold")
                                  )
        epic_p1_text.pack(anchor=tk.W,
                        padx=(40,0),
                        pady=(10,0)
                        )
        
        # Create Epic Path entry boxes
        # Epic entry 1
        epic_path1_entry = ctk.CTkEntry(epic_entry1_frame,
                                         width=300,
                                         state="readonly",
                                         textvariable=self.epic_path1
                                         )
        
        epic_path1_entry.pack(pady=(10,10),
                               padx=(40,0),
                               side="left"
                               )
        
        # Clear Button
        epic_path1_clear_button = ctk.CTkButton(epic_entry1_frame,
                                                text="Clear",
                                                command=lambda:self.clear_file(3),
                                                width=100)
        epic_path1_clear_button.pack(padx=(0,10),
                                     side="right",
                                     )


        epic_path1_button = ctk.CTkButton(epic_entry1_frame,
                                         text="Browse",
                                         command=lambda:self.browse_file(3),
                                         width=100
                                         )
        
        epic_path1_button.pack(padx=(0,10),
                               side="right"
                               )
        
# -----------------------------------------------------------------------------------------
    def browse_file(self, id):
        file_path = filedialog.askdirectory()
        if file_path:
            if id == 1:
                self.steam_path1.set(file_path)
                update_config(self.config_path, self.steam_path1.get(), 1)
                print(f"Path1 Updated to '{file_path}'")
                self.Update_Steam = True
            elif id == 2:
                self.steam_path2.set(file_path)
                update_config(self.config_path, self.steam_path2.get(), 2)
                print(f"Path2 Updated to '{file_path}'")
                self.Update_Steam = True
            elif id == 3:
                self.epic_path1.set(file_path)
                update_config(self.config_path, self.epic_path1.get(), 3)
                print(f"Path3 Updated to '{file_path}'")
                self.Update_Epic = True

# -----------------------------------------------------------------------------------------
    def clear_file(self, id):
        if id == 1:
            self.steam_path1.set(" ")
            update_config(self.config_path, self.steam_path1.get(), 1)
            self.Update_Steam = True
            print("Cleared Path1")
        elif id == 2:
            self.steam_path2.set(" ")
            update_config(self.config_path, self.steam_path2.get(), 2)
            print("Cleared Path2")
            self.Update_Steam = True
        elif id == 3:
            self.epic_path1.set(" ")
            update_config(self.config_path, self.epic_path1.get(), 3)
            print("Cleared Path3")
            self.Update_Epic = True

# -----------------------------------------------------------------------------------------
    def Settings_Menu_Bar(self):
        Menu_Bar_Frame = ctk.CTkFrame(self.settings_Window,
                                      corner_radius=0
                                      )
        Menu_Bar_Frame.pack(fill="x",
                            pady=(0, 0))
        
        # Create back button
        if self.color == "dark":
            back_button_icon_path = os.path.join(self.current_dir, 'Icons', 'Back-Arrow-light.png')
        elif self.color == "light":
            back_button_icon_path = os.path.join(self.current_dir, 'Icons', 'Back-Arrow-dark.png')
        
        back_button_image = Image.open(back_button_icon_path)
        back_button_icon = ctk.CTkImage(back_button_image)
        # back_button = ctk.CTkButton(Menu_Bar_Frame,
        #                             image=back_button_icon,
        #                             width=5,
        #                             height=5,
        #                             text="",
        #                             fg_color='transparent',
        #                             hover=False,
        #                             command=self.create_dashboard
        #                             )
        # back_button.pack(side="left", anchor="w", padx=(10, 0), pady=(2, 0))

        # Create Settings Label
        title = ctk.CTkLabel(Menu_Bar_Frame, 
                            text="Settings",
                            font=("Ariel", 25, "bold"),
                            padx=15,
                            pady=10,
                            )
        title.pack(side="left", anchor="w")

        



# -----------------------------------------------------------------------------------------
    def Kill_All_Widgets(self):
        print("Running Destory All Widgets Function...")
        # Loop through all widgets in current app and destroy
        counter = 0
        for widget in self.root.winfo_children():
            if isinstance(widget, ctk.CTkFrame):
                widget.destroy()
                counter = counter + 1
        if counter > 0:
            print (f"Destroyed {counter} Frames with widgets!")
        elif counter <= 0:
            print ("No Widgets destroyed.")

# -----------------------------------------------------------------------------------------
    def Toggle_Color(self):
        if self.color == "dark":
            self.color = "light"
            return self.color
        else:
            self.color = "dark"
            return self.color
        
# ----------------------------------------------------------------------------------------- 
    def Toggle_Mode(self):
        self.Toggle_Color()
        self.Kill_All_Widgets()
        ctk.set_appearance_mode(self.color)
        self.Set_Title_Bar(self.HWND)
        self.create_dashboard()

# -----------------------------------------------------------------------------------------

    def Set_Title_Bar(self, HWND):
        if self.color == "light": # Set the title bar color to light mode
            # Set Title bar color
            title_bar_color = self.light_bar_color # This is the inverted color of what is shown on the screen when run. For some reason.
            windll.dwmapi.DwmSetWindowAttribute(HWND,35,byref(c_int(title_bar_color)), sizeof(c_int))
        elif self.color == "dark": # Set the title bar color to dark mode
            # Set Title bar color
            self.title_bar_color = self.dark_bar_color # This is the inverted color of what is shown on the screen when run. For some reason.
            windll.dwmapi.DwmSetWindowAttribute(HWND,35,byref(c_int(self.title_bar_color)), sizeof(c_int))