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
from enum import Enum                                               # For enum variable to track sorted state

# Import RGL_Launcher functions
from .Class_Dependencies import *                                   # Import all functions/methods from the 'Class_Dependencies.py' file


# Main Window Class
#
class Main_Window:
    def __init__(self, root):
        self.root = root # set
        root.title("Rocket Game Launcher") # Define the Name of window
        root.geometry("1450x900") # Define the size of the window
        root.resizable(True, True)
        
        self.scrollable_height = 0 # Set the scrollable height to 0
        self.calculate_scrollable_height() # Calculate the scrollable height of the window
        
        self.color = ctk.StringVar() # Set color(dark/light mode)
        theme = self.get_windows_theme() # Get window's current theme and set self.color to it

        # Set the dark/light mode title bar colors
        self.light_bar_color = 0x00dbdbdb
        self.dark_bar_color = 0x002b2b2b

        self.HWND = windll.user32.GetParent(root.winfo_id())

        if theme.get() == "light": # Set the title bar color to light mode
            # Set Title bar color
            title_bar_color = self.light_bar_color # This is the inverted color of what is shown on the screen when run. For some reason.
            windll.dwmapi.DwmSetWindowAttribute(self.HWND,35,byref(c_int(title_bar_color)), sizeof(c_int))
        elif theme.get() == "dark": # Set the title bar color to dark mode
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

        # Game Image Blur
        self.blur_enabled = ctk.BooleanVar()  # Create a BooleanVar to store the state of the checkbox
        user_blur_setting = self.load_blur_setting()
        self.blur_enabled.set(user_blur_setting) # Set the value to the state of the config file
        
        # Set the state of the dialog window
        self.dialog_open = False

        # Retrieve the API key from the environment variable
        env_path = ".env"
        load_dotenv(env_path)
        self.api_key = os.getenv('GIANT_BOMB_API_KEY') # Set the API key to a global variable

        # Set global launcher paths and executables to the value in the config file
        self.steam_path1_current = path["Steam"]["path1"]
        self.steam_path2_current = path["Steam"]["path2"]
        self.steam_executable_current = path["Steam"]["executable"]

        self.epic_path1_current = path["Epic Games"]["path1"]
        self.epic_executable_current = path["Epic Games"]["executable"]

        # This is for future implementation of Battle.NET, Xbox, etc.
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
        
        # This is for future implementation of Battle.NET, Xbox, etc.
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

        
        self.epic_path1.set(self.epic_path1_current)
        self.epic_exe.set(self.epic_executable_current)
        
        # This is for future implementation of Battle.NET, Xbox, etc.
        #self.battle_path1.set(battle_path1_current)
        #self.battle_path2.set(battle_path2_current)
        
        #self.xbox_path1.set(xbox_path1_current)
        #self.xbox_path2.set(xbox_path2_current)
        
        # Create arrays to store games in
        self.paths_dict = None
        self.steam_games = {}
        self.epic_games = {}

        # Bool vars to keep track if the settings changes the path from the config's path
        self.Update_Steam = False
        self.Update_Epic = False

        # Track current sorting method for the game lists (AZ, ZA, Recently Used)
        self.current_sort = StringVar()
        self.current_sort.set("A-Z")  # Default to A-Z sorting

        # Track the destoryed game frame for refreshing the sorted order
        self.destroyed_game_frame = None

        self.load_config() # Loads config from config.ini that returns dictionary of steam & epic games
        self.create_dashboard() # Create GUI

    # Function to load the config file to use for the Listbox of Games.
    def load_config(self):
        print(f"Reading in data from config.ini...")
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
                self.color = ctk.StringVar(value="light") # Set the color to light mode
                return self.color
            else:
                self.color = ctk.StringVar(value="dark") # Set the color to dark mode
                return self.color

        except Exception as e:
            print(f"Error accessing the registry: {e}")
            return None
        

# -----------------------------------------------------------------------------------------
    # Creates the main dashboard that you see on start up
    def create_dashboard(self):
        self.Kill_All_Widgets() # Kill all widgets on the current screen
        self.create_menu_bar() # Create the top menu bar
        self.create_vert_menu_bar() # Create the vertical menu bar

        # Create scrollable frame
        self.scrollable_frame = ctk.CTkScrollableFrame(self.root, fg_color='transparent', orientation="vertical")
        self.scrollable_frame.grid(row=1, column=1, sticky="nsew")

        # Expands games frame (the scrollable frame) to the bottom of the screen
        self.root.grid_rowconfigure(1, weight=1)  

        # Header Text
        text_frame = ctk.CTkFrame(self.scrollable_frame, fg_color= 'transparent')
        text_frame.grid(row=1, column=1, padx=5, pady=(0, 5), sticky="ew")
        steam_text = ctk.CTkLabel(text_frame, text="Games", font=("Ariel", 30, "bold"))
        steam_text.grid(row=2, column=1, padx=(20, 0), pady=(5, 10), sticky="ne")

        # Create sorting dropdown
        sort_options = ["A-Z", "Z-A", "Recently Used"]
        if self.current_sort.get() == "A-Z":
            i = 0
        elif self.current_sort.get() == "Z-A":
            i = 1
        elif self.current_sort.get() == "Recently Used":
            i = 2
            
        sort_var = ctk.StringVar(value=sort_options[i])  # Default to A-Z
        
        # Set the dropdown color according to the mode (dark/light)
        if self.color.get() == 'dark':
            dropdown_fg_color = "#2b2b2b"
            dropdown_text_color = "#ffffff"
            dropdown_button_hover_color = "#878787"
        elif self.color.get() == 'light':
            dropdown_fg_color = "#dbdbdb"
            dropdown_text_color = "#000000"
            dropdown_button_hover_color = "#666666"
        
        # Create the dropdown menu
        sort_dropdown = ctk.CTkOptionMenu(
            self.scrollable_frame,
            width=70,
            values=sort_options,
            variable=sort_var,
            command=lambda x: self.change_sort(x),
            fg_color=dropdown_fg_color,
            text_color=dropdown_text_color,
            button_color=dropdown_fg_color,
            button_hover_color=dropdown_button_hover_color)
        
        # Put it in the grid layout
        sort_dropdown.grid(row=1, column=1, padx=(0,5), pady=10, sticky="e")

        self.create_steam_games_list() # Auto Start on steam games (Home page?)

# -----------------------------------------------------------------------------------------
    def create_menu_bar(self):
        l_frame = ctk.CTkFrame(self.root,
                            corner_radius= 0
                            )
        r_frame = ctk.CTkFrame(self.root,
                            corner_radius= 0
                            )

        # frame.pack(fill="x")
        l_frame.grid(row=0, column=0, sticky="ew")
        r_frame.grid(row=0, column=1, sticky="nsew")

        # Makes the column '1' span the width of the page (the same column the games are on)
        self.root.grid_columnconfigure(1, weight=1) 

        # Create Launcher Icon and title
        title = ctk.CTkLabel(l_frame, 
                            text="Home",
                            font=("Ariel", 27, "bold"),
                            padx=20,
                            pady=10
                            )
        # title.pack(side="left")
        title.grid(row=0, column=0, padx=0, pady=10, sticky="w")

        # Create settings button
        if self.color.get() == "dark":
            settings_icon_path = os.path.join(self.current_dir, 'Icons', 'Settings-Gear-light.png') # Create full path of image
            
        elif self.color.get() == "light":
            settings_icon_path = os.path.join(self.current_dir, 'Icons', 'Settings-Gear-dark.png') # Create full path of image

        settings_image = Image.open(settings_icon_path)
        settings_icon = ctk.CTkImage(settings_image)
        settings = ctk.CTkButton(r_frame,
                                 image=settings_icon,
                                 width=5,
                                 height=5,
                                 text="",
                                 fg_color='transparent',
                                 hover=False,
                                 command=self.Show_Settings_Menu
                                )
        
        # settings.pack(side="right", anchor="e", padx=(0,10))
        settings.grid(row=0, column=2, padx=(0, 15), pady=(20,0), sticky="e")


        # Create mode toggle button
        if self.color.get() == "dark":
            mode_icon_path = os.path.join(self.current_dir, 'Icons', 'Switch-Mode-light.png') # Create full path of image
        elif self.color.get() == "light":
            mode_icon_path = os.path.join(self.current_dir, 'Icons', 'Switch-Mode-dark.png') # Create full path of image
        
        mode_image = Image.open(mode_icon_path)
        mode_icon = ctk.CTkImage(mode_image)
        toggle_mode = ctk.CTkButton(r_frame,
                                    image=mode_icon,
                                    width=5,
                                    height=5,
                                    text="",
                                    fg_color='transparent',
                                    hover=False,
                                    command=self.Toggle_Mode
                                    )
        
        # toggle_mode.pack(side="right", anchor="e", padx=(0,5))
        toggle_mode.grid(row=0, column=1, padx=(0, 5), pady=(20,0), sticky="e")

        # Moves the two icons to the right side of the screen (on column 1, the title is on column 0 which is seperate)
        r_frame.grid_columnconfigure(0, weight=1) 
        r_frame.grid_columnconfigure(1, weight=0)
        r_frame.grid_columnconfigure(2, weight=0)

    def create_vert_menu_bar(self):
        # Vertical Frame
        vertical_column_frame = ctk.CTkFrame(self.root, width=150, corner_radius=0)
        vertical_column_frame.grid(row=1, column=0, sticky="nsew") # Make the frame stick to the left side of the window

        # self.root.grid_columnconfigure(0, weight=0, minsize=150) # DELETE AFTER TESTING

        steam_icon_path = os.path.join(self.current_dir, 'Icons', 'Steam-Icon.png') # Create full path of image
        epic_games_icon_path = os.path.join(self.current_dir, 'Icons', 'Epic-Games-Icon.png') # Create full path of image

        if os.path.exists(steam_icon_path):
            steam_image = Image.open(steam_icon_path)
            steam_image = steam_image.resize((25, 25))  # Resize the image to fit the button
            steam_icon = ctk.CTkImage(steam_image, size=(25,25))
            steam_games = ctk.CTkButton(vertical_column_frame, text="", font=("Ariel", 25, "bold"), image=steam_icon, command=self.create_steam_games_list, height=75, width=100, fg_color='transparent')
        else:
            steam_games = ctk.CTkButton(vertical_column_frame, text="Steam", font=("Ariel", 25, "bold"), command=self.create_steam_games_list, height=50, width=200)
            print(f"Steam Icon not found at {steam_icon_path}")

        if os.path.exists(epic_games_icon_path):
            epic_games_image = Image.open(epic_games_icon_path)
            epic_games_image = epic_games_image.resize((70, 50))  # Resize the image to fit the button
            epic_games_icon = ctk.CTkImage(epic_games_image, size=(70,50))
            epic_games = ctk.CTkButton(vertical_column_frame, text="", font=("Ariel", 25, "bold"), image=epic_games_icon, command=self.create_epic_games_list, height=75, width=100, fg_color='transparent')
        else:
            epic_games = ctk.CTkButton(vertical_column_frame, text="Epic Games", font=("Ariel", 25, "bold"), command=self.create_epic_games_list, height=50, width=200)
            print(f"Epic Games Icon not found at {epic_games_icon_path}")


        column_title = ctk.CTkLabel(vertical_column_frame, text="Launchers", font=("Ariel", 35, "bold"), fg_color='transparent')
        #column_title.pack(pady=(10, 0), padx=(20, 20))

        # Buttons
        # home_button = ctk.CTkButton(vertical_column_frame, text="Home", command=self.create_dashboard)
        # home_button.pack(pady=(10, 0), padx=(10, 0))

        steam_games.pack(pady=(20, 0), padx=5, anchor="w")

        epic_games.pack(pady=(20, 0), padx=5, anchor="w")        

    def create_epic_games_list(self):
        # Destory any game frame (including placeholder frames) currently on the screen
        self.destory_games()

        self.epic_games_frame = ctk.CTkFrame(self.scrollable_frame)
        self.epic_games_frame.grid(row=2, column=1, sticky="nsew", padx=(15, 5))
        
        self.epic_games_frame.grid_rowconfigure(0, weight=1)
        self.epic_games_frame.grid_columnconfigure(0, weight=1)
        
        num_columns = 4
        for i in range(num_columns):
            self.epic_games_frame.grid_columnconfigure(i, uniform="game")

        print("\n[Epic Games] Dictionary List:")
        print(f"[Unsorted] Epic Games Dictionary (Name, [Exe, Launcher Exe]): {self.epic_games}")
        
        if self.current_sort.get() == "A-Z":
            self.epic_games = OrderedDict(sorted(self.epic_games.items())) # Sort the steam game list A-Z
        elif self.current_sort.get() == "Z-A":
            self.epic_games = OrderedDict(sorted(self.epic_games.items(), reverse=True)) # Sort the steam game list Z-A
        elif self.current_sort.get() == "Recently Used":
            self.epic_games = OrderedDict(sorted(self.epic_games.items())) # FOR NOW just sort it normally A-Z
        
        print(f"[Sorted] Epic Games Dictionary (Name, [Exe, Launcher Exe]): {self.epic_games}")

        counter = 0
        print()
        # Loop over the games in the library and run function to get photos (NOT IMPLEMENTED YET)
        for name, game_info in self.epic_games.items(): # Print items in epic games array
            game_exe_path = game_info['Executable']
            launcher_exe_path = game_info['Launcher Executable']
            # print(f"Game path for {name}: {game_exe_path} and launcher path is: {launcher_exe_path}")
            self.create_epic_games_button(name, game_exe_path, launcher_exe_path, counter, num_columns)
            counter += 1
        else:
            if counter == 0:
                print("No games found in Epic Path. Calling placeholder function...")
                if self.epic_games_frame.winfo_exists(): 
                    self.epic_games_frame.destroy() # Destroy the scrollable frame and replace with a non scrollable one to present the text
                    print("Games Frame Destroyed!")
                else:
                    print("Games Frame doesn't exist.")
                self.epic_game_placeholder_text()
        
    # -----------------------------------------------------------------------------------------
    def epic_game_placeholder_text(self):
        if self.color.get() == 'dark':
            # current_text_color = "#dce4ee"
            current_text_color = "#777777"
        elif self.color.get() == 'light':
            current_text_color = "#1a1a1a"
        
        self.epic_game_frame = ctk.CTkFrame(self.scrollable_frame,
                                        height=100
                                        )
        self.epic_game_frame.grid(row=2, column=1, sticky="nsew", padx=(15,5))

        # Old Pack Method
        # self.epic_game_frame.pack(padx=5,
        #                  fill="both",
        #                  expand=True
        #                 )
        

        placeholder_label = ctk.CTkLabel(self.epic_game_frame,
                                         text="No Games Found",
                                         text_color=current_text_color,
                                         font=("Ariel", 25, "bold")
                                        )
        placeholder_label.grid(row=0, column=0, sticky="nsew")

        
        # Old Pack Method
        # placeholder_label.pack(side="top",
        #                        pady=20,
        #                        padx=(50,0),
        #                        expand=True
        #                        )

        self.epic_game_frame.grid_rowconfigure(0, weight=1)
        self.epic_game_frame.grid_columnconfigure(0, weight=1)


    # -----------------------------------------------------------------------------------------
    def create_epic_games_button(self, game_name, game_path, launcher_path, iteration, num_columns):
        # Determine the row and column based on the iteration
        row = iteration // num_columns
        column = iteration % num_columns
        
        # Store the path to the play button image
        play_button_path = os.path.join(self.current_dir, 'Icons', 'Play-Button-light.png')

        # Open the play button image
        open_image = Image.open(play_button_path)
        play_button_image = ctk.CTkImage(open_image)

        # Define cache dir
        cache_dir = os.path.join(self.current_dir, 'Cache', 'EpicGames')
        os.makedirs(cache_dir, exist_ok=True)

        # Define the cache file path for current game
        cache_file_path = os.path.join(cache_dir, f"{game_name.replace(' ', '_')}.png")

        # Check if the image is already cached
        if os.path.exists(cache_file_path):
            print(f"[Epic Games] Loading cached image for game '{game_name}' found in '{cache_file_path}'")
            epic_game_image = Image.open(cache_file_path)
        else:
            print(f"[Epic Games] Fetching image for {game_name} from API using {self.api_key} as key")
            epic_game_image = grab_epic_game_photo(self.api_key, game_name) # Call the function to get the image from the API
        if epic_game_image == None:
            # Use a placeholder image if API fails to fetch the image
            epic_game_image = Image.open(os.path.join(self.current_dir, 'Icons', 'Placeholder_Image.png')) # Set the image to the placeholder since the API couldn't get the photo
        elif not os.path.exists(cache_file_path):
            epic_game_image.save(cache_file_path)
            print(f"[Epic Games] Cached image for {game_name} at {cache_file_path}")

        # Resize image
        _epic_game_image = epic_game_image.resize((300, 450))

        # Apply rounded corners and blur effect (if enabled)
        if self.blur_enabled.get():
            blurred_game_photo = add_blur_gradient(_epic_game_image, 10, 0.15)
            rounded_blurred_image = add_rounded_corners(blurred_game_photo, 10)
            game_image = ImageTk.PhotoImage(rounded_blurred_image)
        else:
            rounded_image = add_rounded_corners(_epic_game_image, 10)
            game_image = ImageTk.PhotoImage(rounded_image)

        # Create a CTkCanvas to overlay the button on the image
        if self.color.get() == 'dark':
            current_background_color = "#2b2b2b"
        elif self.color.get() == 'light':
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
            fg_color="transparent",  # Match Steam button
            bg_color="transparent",  # Match Steam button
            text_color="white",  # Match Steam button
            width=80,
            height=50,
            hover_color="#756e6d",  # Match Steam button hover color
            corner_radius=0,
            border_width=0,
            anchor="center",
            command=lambda: launch_epic_game(game_path, game_name, launcher_path)
        )

        # Set button padding
        padding_x = 10
        button_x = (300 - padding_x) / 2  # Center button with padding
        button_y = 400  # Position button near the bottom of the canvas

        # Place the button on the canvas with padding
        canvas.create_window(button_x, button_y, window=epic_play_button)

# -----------------------------------------------------------------------------------------
    def create_steam_games_list(self):
        # Destory any game frame (including placeholder frames) currently on the screen
        self.destory_games()

        # Array of Steam Games Frame
        self.steam_games_frame = ctk.CTkFrame(self.scrollable_frame)
        self.steam_games_frame.grid(row=2, column=1, sticky="nsew", padx=(15, 5))

        # Array of Game names and App ids sperately taken from self.steam_games array
        game_names = []
        app_ids = []
        
        # Sort the Dictionary by A-Z
        print("\n[Steam] Dictionary List:")
        print(f"[Unsorted] Steam Games Dictionary (Name, AppID): '{self.steam_games}'")

        print(f"Steam Games Dictionary's sort order is set to '{self.current_sort.get()}'")

        # Sort the list of games in the correct order
        if self.current_sort.get() == "A-Z":
            self.steam_games = OrderedDict(sorted(self.steam_games.items())) # Sort the steam game list A-Z
        elif self.current_sort.get() == "Z-A":
            self.steam_games = OrderedDict(sorted(self.steam_games.items(), reverse=True)) # Sort the steam game list Z-A
        elif self.current_sort.get() == "Recently Used":
            self.steam_games = OrderedDict(sorted(self.steam_games.items())) # FOR NOW just sort it normally A-Z
        
        print(f"[Sorted] Steam Games Dictionary (Name, AppID): '{self.steam_games}'")
        
        # Process each config string
        for config_string in self.steam_games:
            # Extract the game name and app ID
            for game_name, app_id in self.steam_games.items():
                game_names.append(game_name)
                app_ids.append(app_id)

        num_columns = 4
        for i in range(num_columns):
            self.steam_games_frame.grid_columnconfigure(i, uniform="game")

        # print("Game Names:", game_names)  
        # print("App IDs:", app_ids)

        # C:\Program Files (x86)\Steam\appcache\librarycache (This is steam's logos folder path)
        # print (f"Steam exe path var: {steam_logo_path}")
        # Example of photo name of logo
        # 4000_library_600x900.jpg

        # steam_exe_path = self.steam_exe.get() # Store the exe path in var to manipulate
        # steam_logo_path = steam_exe_path.replace('steam.exe', 'appcache\\librarycache\\') # var that stores the icon cache of all photos
        
        # logo_600x900 = "_library_600x900.jpg" # last half of the jpg file that is the same

        print("\n[Steam] Loading Images:")
        counter = 0
        for game_name, app_id in self.steam_games.items():
            
            app_id_logo_path = get_cover_image(app_id, game_name) # Run Function to get the cover image either local or from API
            # print(f"Calling Function 'Create Steam Button' with {app_id_logo_path} as logo and {game_name} as game")
            self.create_steam_game_button(app_id_logo_path, game_name, app_id, counter, num_columns) # Function call to create steam game button
            #self.steam_games_frame.grid_rowconfigure(counter, weight=1)  # Make rows expand evenly
            counter += 1
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
        # Set the correct text color
        if self.color.get() == 'dark':
            current_text_color = "#777777"
        elif self.color.get() == 'light':
            current_text_color = "#1a1a1a"
        
        # Create the game frame inside the scrollable frame
        self.steam_game_frame = ctk.CTkFrame(self.scrollable_frame, height=100)
        self.steam_game_frame.grid(row=1, column=0, padx=5, pady=5, sticky="nsew")

        # Create the placeholder text label
        placeholder_label = ctk.CTkLabel(self.steam_game_frame, text="No Games Found", text_color=current_text_color, font=("Ariel", 20, "normal"))
        placeholder_label.grid(row=1, column=0, padx=(50, 0), pady=20, sticky="n")

        # let the label’s cell expand (so centering works)
        self.steam_game_frame.grid_rowconfigure(0, weight=1)
        self.steam_game_frame.grid_columnconfigure(0, weight=1)

# -----------------------------------------------------------------------------------------    
    def create_steam_game_button(self, logo_path, game_name, app_id, iteration, num_columns):
        # Determine the row and column based on the iteration
        row = iteration // num_columns
        column = iteration % num_columns
        
        # Store the path to the play button image
        play_button_path = os.path.join(self.current_dir, 'Icons', 'Play-Button-light.png')

        # Open the play button image
        open_image = Image.open(play_button_path)
        play_button_image = ctk.CTkImage(open_image)

        # Load and process the image
        game_image_open = Image.open(logo_path)
        game_image_resize = game_image_open.resize((300, 450))
        
        # Adhear to user settings for game image blur
        if self.blur_enabled.get() == True:
            blurred_game_photo = add_blur_gradient(game_image_resize, 10, 0.15)  # Adjust blur effect and height ratio
            rounded_blurred_image = add_rounded_corners(blurred_game_photo, 10) # Adjust radius of photo here
            game_image = ImageTk.PhotoImage(rounded_blurred_image)
        elif self.blur_enabled.get() == False:
            rounded_image = add_rounded_corners(game_image_resize, 10)
            game_image = ImageTk.PhotoImage(rounded_image)

        # Create a CTkCanvas to overlay the button on the image
        if self.color.get() == 'dark':
            current_background_color = "#2b2b2b"
        elif self.color.get() == 'light':
            current_background_color = "#dbdbdb"
        canvas = ctk.CTkCanvas(self.steam_games_frame, width=300, height=450, bg=current_background_color, highlightthickness=0)
        canvas.image = game_image # Keep reference
        canvas.create_image(0, 0, anchor='nw', image=game_image) # Add the image to the canvas
        canvas.grid(row=row, column=column, padx=10, pady=10)

        # Add the play button on top of the image
        steam_play_button = ctk.CTkButton(
            canvas,
            text="Play",
            image=play_button_image,
            font=("Ariel", 16, "bold"),
            fg_color="transparent",
            bg_color= 'transparent',
            text_color="white",
            width=80,
            height=50,
            hover_color="#756e6d",
            corner_radius=0,
            border_width=0,
            anchor="center",
            command=lambda:launch_steam_game(app_id, self.steam_executable_current, game_name)
        )

        # Set button padding
        padding_x = 10
        button_x = (300 - padding_x) / 2# Center button with padding
        button_y = 400  # Position button near the bottom of the canvas

        # Place the button on the canvas with padding
        canvas.create_window(button_x, button_y, window=steam_play_button)

# -----------------------------------------------------------------------------------------
    def Show_Settings_Menu(self): # This function should wipe all widgets on screen and then show the settings menu
        if (hasattr(self, "settings_frame") and self.settings_frame.winfo_exists()):
            print("Settings Menu Already Open")
            return # If the settings frame already exists, do nothing

        print("Opened Settings Menu!")
        self.Create_Settings_Widgets() # Creates settings widgets
        
# -----------------------------------------------------------------------------------------
    def refresh_launchers(self):
        self.settings_Window.destroy()
        self.save_blur_setting(self.current_blur_state)
        if self.Update_Steam == True or self.Update_Epic == True:
            self.Update_Steam = False
            self.Update_Epic = False
            self.Kill_All_Widgets()
            self.load_config()
            self.create_dashboard()
        else:
            return None

# -----------------------------------------------------------------------------------------
    def Create_Settings_Widgets(self):
        self.current_blur_state = self.blur_enabled.get()
        self.settings_Window = ctk.CTkToplevel(self.root)
        self.settings_Window.geometry("625x335")
        self.settings_Window.title("Settings")
        self.settings_Window.iconbitmap(self.icon_path) # Now set the custom icon using the path made above.
        self.settings_Window.resizable(False, False) # Make the window not resizable
        
        self.Settings_Menu_Bar()
                
        # Create scrollable frame
        self.settings_frame = ctk.CTkScrollableFrame(self.settings_Window,
                                                     fg_color='transparent'
                                                    )
        self.settings_frame.pack(fill="both",
                                   pady=(5,0), 
                                   expand=True, 
                                   #ipady=self.scrollable_height  # THIS MIGHT CAUSE THE ISSUE OF NOT SEEING CHECKBOX
                                  )
        
        self.settings_container = ctk.CTkFrame(self.settings_frame, fg_color='transparent')
        self.settings_container.pack(fill="both", expand=True)

        self.load_user_settings_prefrences() # Load UI for user settings preferences
        self.load_steam_settings() # Load UI for steam path settings
        self.load_epic_games_settings() # Load UI for epic path settings
        
        
        popup_hwnd = windll.user32.GetParent(self.settings_Window.winfo_id())
        self.Set_Title_Bar(popup_hwnd)
        self.settings_Window.attributes('-topmost', True)
        self.settings_Window.protocol("WM_DELETE_WINDOW", self.refresh_launchers)
        

    def load_user_settings_prefrences(self):
        # Frame
        checkbox_text_frame = ctk.CTkFrame(self.settings_container,
                                    #    fg_color='transparent'
                                     )
        
        checkbox_text_frame.pack(padx=5,
                            pady=(0,15),
                            fill="x",
                            expand=True
                            )
        
        checkbox_text = ctk.CTkLabel(checkbox_text_frame, 
                                       text="Preferences",
                                       font=("Ariel", 20, "bold")
                                       )
        
        checkbox_text.pack(anchor="w",
                           padx=(40,0),
                           pady=(10,0)
                           )
        
        checkbox_frame = ctk.CTkFrame(checkbox_text_frame)
        checkbox_frame.pack(fill="both", pady=10, padx=10)

        
        
        # Checkbox itself
        checkbox_blur = ctk.CTkCheckBox(checkbox_frame,
                                    text="Enable Blur Effect",
                                    variable=self.blur_enabled,
                                    onvalue=True,
                                    offvalue=False,
                                    command=self.reload_main_window
                                    )
        
        checkbox_blur.pack(anchor="w",
                        padx=(40,0),
                        pady=10
                        )
        
        # Does not work as intended
        # checkbox_theme = ctk.CTkCheckBox(checkbox_frame,
        #                                  text="Enable Dark Mode",
        #                                  onvalue="dark",
        #                                  offvalue="light",
        #                                  variable=self.color,
        #                                  command=self.Toggle_Mode
        #                              )

        # checkbox_theme.pack(anchor="w",
        #                     padx=(40,0),
        #                     pady=10
        #                    )

    def reload_main_window(self):
        self.Kill_All_Widgets()
        self.create_dashboard()

# -----------------------------------------------------------------------------------------
    def load_steam_settings(self):
        # Create settings frame
        steam_settings_frame = ctk.CTkFrame(self.settings_container,
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
        if self.dialog_open == True:
            print("Dialog already open")
            return

        # Mark the dialog as open
        self.dialog_open = True
        
        try:
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

        finally:
            self.dialog_open = False  # Mark the dialog as closed

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
        if self.color.get() == "dark":
            back_button_icon_path = os.path.join(self.current_dir, 'Icons', 'Back-Arrow-light.png')
        elif self.color.get() == "light":
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
    def Toggle_Mode(self):
        # Get current mode and toggle it
        current_mode = self.color.get()
        self.color.set("light" if current_mode == "dark" else "dark")

        # Change appearence mode & Update UI
        self.Kill_All_Widgets()
        ctk.set_appearance_mode(self.color.get())
        self.Set_Title_Bar(self.HWND)
        self.create_dashboard()

# -----------------------------------------------------------------------------------------

    def Set_Title_Bar(self, HWND):
        if self.color.get() == "light": # Set the title bar color to light mode
            # Set Title bar color
            title_bar_color = self.light_bar_color # This is the inverted color of what is shown on the screen when run. For some reason.
            windll.dwmapi.DwmSetWindowAttribute(HWND,35,byref(c_int(title_bar_color)), sizeof(c_int))
        elif self.color.get() == "dark": # Set the title bar color to dark mode
            # Set Title bar color
            self.title_bar_color = self.dark_bar_color # This is the inverted color of what is shown on the screen when run. For some reason.
            windll.dwmapi.DwmSetWindowAttribute(HWND,35,byref(c_int(self.title_bar_color)), sizeof(c_int))

# -----------------------------------------------------------------------------------------
    def adjust_columns(self):
        window_width = self.root.winfo_width()  # **Get the current width of the window**
        num_columns = window_width // 350  # Assuming each button takes up around 350px  # **Calculate number of columns**
        return max(num_columns, 2)  # **Ensure there is a minimum of 2 columns**
    # -----------------------------------------------------------------------------------------

    def calculate_scrollable_height(self):
        # Set the scrollable height of the window
        window_height = self.root.winfo_height()
        self.scrollable_height = int(window_height)
        #print(f"Calculated scrollable height to {self.scrollable_height}")

    # ------------------------------------------------------------------------------------------
    def load_blur_setting(self):
        config = configparser.ConfigParser()
        if os.path.exists(self.config_path):
            config.read(self.config_path)
            try:
                state = config.getboolean('Settings', 'blur_enabled', fallback=True)  # Default to True if not found
                return state
            except Exception as e:
                print(f"Error reading blur_enabled from config: {e}")
        return True  # Default to True if the config file doesn't exist
    
    # ------------------------------------------------------------------------------------------
    def save_blur_setting(self, current):
        if current != self.blur_enabled.get():
            config = configparser.ConfigParser()
            if os.path.exists(self.config_path):
                config.read(self.config_path)
            if 'Settings' not in config:
                config['Settings'] = {}
            config['Settings']['blur_enabled'] = str(self.blur_enabled.get())  # Save the current value

            with open(self.config_path, 'w') as config_file:
                config.write(config_file)
            print("Blur setting saved.")
        else:
            print("Blur setting unchanged.")
        
    # ------------------------------------------------------------------------------------------
    def change_sort(self, x):
        if x == self.current_sort.get():
            print(f"[Sort] Already set to {self.current_sort.get()}")
        elif x == "Z-A":
            self.current_sort.set(x)
            print(f"[Sort] Set to {self.current_sort.get()}. Reloading game order...")
            self.refresh_sorting() # Reload the game frame in the new sorted order
        elif x == "A-Z":
            self.current_sort.set(x)
            print(f"[Sort] Set to {self.current_sort.get()}. Reloading game order...")
            self.refresh_sorting() # Reload the game frame in the new sorted order

        elif x == "Recently Used":
            self.current_sort.set(x)
            print(f"[Sort] Set to {self.current_sort.get()}. Reloading game order...")
            self.refresh_sorting() # Reload the game frame in the new sorted order
            
        else:
            print("Passed value is not valid for current sorting structure.")

    # ------------------------------------------------------------------------------------------

    def refresh_sorting(self):
        self.destory_games()

        if self.destroyed_game_frame == "Steam":
            self.create_steam_games_list()
        elif self.destroyed_game_frame == "Epic":
            self.create_epic_games_list()


    # ------------------------------------------------------------------------------------------

    def destory_games(self):
         # Destroy Steam frame and placeholder if they exist
        if hasattr(self, 'steam_games_frame') and self.steam_games_frame.winfo_exists():
            self.steam_games_frame.destroy()
            print("Steam Games Frame Destroyed!")
            self.destroyed_game_frame = "Steam"
        elif hasattr(self, 'steam_game_frame') and self.steam_game_frame.winfo_exists():
            self.steam_game_frame.destroy()
            print("Steam Games Placeholder Destroyed!")
            self.destroyed_game_frame = "Steam"

        # Destroy Epic Games frame or placeholder if it exists
        if hasattr(self, 'epic_games_frame') and self.epic_games_frame.winfo_exists():
            self.epic_games_frame.destroy()
            print("Epic Games Frame Destroyed!")
            self.destroyed_game_frame = "Epic"
        elif hasattr(self, 'epic_game_frame') and self.epic_game_frame.winfo_exists():
            self.epic_game_frame.destroy()
            print("Epic Games Placeholder Destroyed!")
            self.destroyed_game_frame = "Epic"

