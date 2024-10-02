# ----------------------------------
#      File Name: Class_Dependencies.py
#           Date: 8/28/24
#    Description: This is the dependencies of the class 'Main_Window'. Originally in 'driver.py'.
#                 These functions include (in this order of this file):
#                 1. reading the config file
#                 2. updating the config file
#                 3. creating a array dictionary from the config file
#                 4. storing that dictionary
#                 5. Grabbing all steam games installed
#                 6. Launching selected steam game
#                 7. Grabbing all epic games installed
#                 8. Launching selected epic game
#                 
#           Note: Currently as of v2.0 only Steam is supported at the moment.
#                 Epic Games, Battle.NET, and possibly Xbox will be next.
# -----------------------------------------------------------------------
# Import Statement(s)
# -------------------
# Tkinter Import Statement(s)
from tkinter import messagebox                                      # For displaying message boxes and handling string vars in Tkinter
# -----------------
# Misc Statement(s)
import configparser                                                 # For handling .ini config files
import subprocess                                                   # For executing sys commands and processes
import os                                                           # For interacting with the current operating sys
import re                                                           # For working with regex
import json                                                         # For parsing and handling JSON files
import time                                                         # For time-related functions and delays
from dotenv import load_dotenv                                      # For loading the .env file for API access
import requests                                                     # For requesting the API
from io import BytesIO
from PIL import Image, ImageFilter, ImageDraw, ImageOps
#
# ------------------------------------------------------------------
# Reads in the config file provided in the parameter and returns it.

def read_config_file(file_path):
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"The configuration file {file_path} does not exist.")
    
    config = configparser.ConfigParser()
    config.read(file_path)

    paths = {}
    for section in config.sections():
        path1 = config.get(section, 'path1', fallback=None)
        path2 = config.get(section, 'path2', fallback=None)
        executable = config.get(section, 'executable', fallback=None)
        paths[section] = {'path1': path1, 'path2': path2, 'executable': executable}
    
    return paths
#
# ------------------------------------------------------------
# Updates the config file when a new path is selected via GUI.

def update_config(file_path, new_path, id):
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"The configuration file {file_path} does not exist.")
    
    config = configparser.ConfigParser()
    config.read(file_path)

    # Counters for path1 and path2 occurrences
    path1_count = 0
    path2_count = 0
    updated = False

    for section in config.sections():
        path1 = config.get(section, 'path1', fallback=None)
        path2 = config.get(section, 'path2', fallback=None)

        # Increment counts based on existing paths
        if path1 is not None:
            path1_count += 1
        if path2 is not None:
            path2_count += 1
        
        # Determine which path to update based on id
        if id == 1 and path1_count == 1:  # Update first path1
            config.set(section, 'path1', new_path)
            updated = True
        elif id == 2 and path2_count == 1:  # Update first path2
            config.set(section, 'path2', new_path)
            updated = True
        elif id == 3 and path1_count == 2:  # Update second path1
            config.set(section, 'path1', new_path)
            updated = True

    # Write the changes back to the file if any updates were made
    if updated:
        with open(file_path, 'w') as configfile:
            config.write(configfile)
    else:
        raise ValueError(f"No matching path found for id {id}.")
#
# --------------------------------------------------------------------
# Function to return an array dictionary from the read in config file.

def create_section_vars(paths_data):
    section_vars = {}
    for section, paths in paths_data.items():
        section_vars[section] = (paths['path1'], paths['path2'], paths['executable'])
    return section_vars
#
# ---------------------------------------------------------------------------
# Store each of the launcher's path and executable in an array and return it.

def store_path_vars(sections):
    paths_dict = {}
    
    steam_paths = sections.get('Steam')
    if steam_paths:
        steam_path1, steam_path2, executable = steam_paths
        paths_dict['Steam'] = {'path1': steam_path1, 'path2': steam_path2, 'executable': executable}

    epic_games_paths = sections.get('Epic Games')
    if epic_games_paths:
        epic_games_path1, epic_games_path2, executable = epic_games_paths
        paths_dict['Epic Games'] = {'path1': epic_games_path1, 'path2': epic_games_path2, 'executable': executable}

    # FOR FUTURE IMPLEMENTATION of Battle.NET
    # ----------------------------------------------------
    # battle_net_paths = sections.get('Battle.NET')
    # if battle_net_paths:
    #     battle_net_path1, battle_net_path2, executable = battle_net_paths
    #     paths_dict['Battle.NET'] = {'path1': battle_net_path1, 'path2': battle_net_path2, 'executable': executable}
    # ----------------------------------------------------

    return paths_dict
#
# ------------------------------------------------------------------------------------------------------------------------------------------------
# Function(s) to get and launch Steam games
# Function to get all appmanifest files from the provided path, parse 'name' and 'appid', store in array, return it, and Error handle when needed.

def get_steam_games(manifests_folder):
    Steam_Games = {}

    try:
        for filename in os.listdir(manifests_folder):
            if filename.startswith("appmanifest") and filename.endswith(".acf"):
                app_id = filename.split('_')[1].split('.')[0]
                with open(os.path.join(manifests_folder, filename), 'r', encoding='utf-8') as r:
                    for line in r:
                        if "name" in line:
                            game_name = line.split('"')[3]
                            game_name = re.sub(r'[^\w\s:]', '', game_name)
                            if game_name == "Steamworks Common Redistributables":
                                break
                            else:
                                Steam_Games[game_name] = app_id
                                break
        return Steam_Games        
                    
    except FileNotFoundError as fnf_error:
        fnf_error = "[WinError3] The system cannot find the path specified in 'config.ini'."
        # messagebox.showerror("Error", fnf_error)
        no_games_found_text = f"No Games Found in '{manifests_folder}'"
        return no_games_found_text
#
# -------------------------------------------------------------------------------------------------------------------------
# Function to launch the provided steam game given the parameters (the game's appid, steam's exe path, and the game's name)

def launch_steam_game(app_id, steam_path, name):
    command = [steam_path, "-applaunch", str(app_id)]
    print(f"Launching Game \"{name}\"...")
    time.sleep(2) # Pauses for 2 seconds
    print(f"Successfully Launched \"{name}\"")
    try:
        subprocess.run(command)
    except subprocess.CalledProcessError as e:
        messagebox.showerror("Launcher", f"Failed to launch game: {e}")
    except FileNotFoundError as fnf_error:
        messagebox.showerror("Launcher", f"Executable not found: {fnf_error}")
#
# -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
# Function(s) to get and launch Epic games
# Function to find the executables for each game given the path (example path: 'C:\Program Files\Epic Games', which is the default in most machines) and the launcher's executable as parameters.

def get_epic_games(game_folder, launcher_executable):
    Epic_Games = {}
    for filename in os.listdir(game_folder):
        if filename.endswith(".item"):
            with open(os.path.join(game_folder, filename), 'r', encoding='utf-8') as file:
                data = json.load(file)
                display_name = data.get("DisplayName", "")
                install_location = data.get("InstallLocation", "")
                launch_executable = data.get("LaunchExecutable", "")
                if launch_executable == "FortniteGame/Binaries/Win64/FortniteLauncher.exe": # Change the fortnite executable because the one in the binary file requires you to launch through epic games launcher.
                    launch_executable = "FortniteGame/Binaries/Win64/FortniteClient-Win64-Shipping_EAC_EOS.exe" # Change to the one that lets you do it without launching it via the epic games launcher.
                executable_location = os.path.normpath(os.path.join(install_location, launch_executable))
                # print(display_name, executable_location)
                Epic_Games[display_name] = {
                    "Executable": executable_location,
                    "Launcher Executable": launcher_executable
                }
    return Epic_Games
#
# ---------------------------------------------------------------------------------------------------------------------------------------
# Function to launch the provided epic game given the parameters (the game's executable path, the game's name, and epic game's exe path).
def launch_epic_game(executable_path, name, epic_games_launcher_executable):
    try:
        subprocess.call(executable_path)
        print(f"Launching Game \"{name}\"...")
        time.sleep(2) # Pauses for 2 seconds
        print(f"Successfully Launched \"{name}\"") # Print that is successfully launched.
        #self.Exit()
    except subprocess.CalledProcessError as e:
        print (f"Failed to Launch Game, Launching Epic Games Store by default: \"{name}\"... Error: {e}") # Print the error statement in detail.
        subprocess.call(epic_games_launcher_executable)
    except FileNotFoundError as fnf:
        print (f"Failed to Find Game, Make sure the game is installed. Opening Epic Games Store...")
        subprocess.call(epic_games_launcher_executable)

# ---------------------------------------------------------------------------------------------------------------------------------------
# 
def grab_epic_game_photo(api_key, game_title):
    # Base URL for Giant Bomb API
    base_url = 'https://www.giantbomb.com/api'

    # Search endpoint URL
    search_url = f'{base_url}/search'

    # Query parameters for the search
    params = {
        'api_key': api_key,
        'format': 'json',
        'query': game_title,
        'resources': 'game',  # Specify the type of resource you're searching for
        'limit': 1            # Number of results to return
    }

    # Headers including User-Agent
    headers = {
        'User-Agent': 'Rocket_Game_Launcher/1.0 -- Testing Channel'
    }

    # Perform the search request
    print()
    print(f"Attempting to get Image from {base_url}...")
    response = requests.get(search_url, params=params, headers=headers)
    
    # Check the response
    print(f"Status Code: {response.status_code}")
    # print(f"Response Content: {response.text}")

    
    if response.status_code == 200:
        try:
            data = response.json()  # Decode JSON response
            results = data.get('results', [])
            
            if results:
                # Fetch the first result's details
                game = results[0]
                title = game.get('name', 'Unknown')
                cover_image_url = game.get('image', {}).get('medium_url', 'No image available')
                
                print(f"Searching Game Title: {title}")
                print(f"Using Cover Image URL: {cover_image_url}")
                
                if cover_image_url != 'No image available':
                    # Fetch the image from the URL
                    image_response = requests.get(cover_image_url)
                    if image_response.status_code == 200:
                        image_data = BytesIO(image_response.content)
                        image = Image.open(image_data)
                        return image
                    else:
                        print(f"Failed to fetch image, status code: {image_response.status_code}")
                else:
                    print("No image URL available")
            else:
                print("No results found")

        except ValueError as e:
            print(f"Error decoding JSON: {e}")
            print("Response content:", response.text)
    else:
        print(f"Error: HTTP Status Code {response.status_code}")
        print("Response content:", response.text)
    
    return None

def add_blur_gradient(image, blur_radius, blur_height_ratio):
        """
        Apply a blur gradient effect that starts at the bottom and transitions upwards.
        
        Parameters:
        - image: The input image.
        - blur_radius: The strength of the blur.
        - blur_height_ratio: The ratio of the image height over which the blur should be applied (0.0 to 1.0).
        
        Returns:
        - The image with the blur gradient applied.
        """
        # Create a blurred version of the image
        blurred_image = image.filter(ImageFilter.GaussianBlur(blur_radius))
        
        # Create a gradient mask
        width, height = image.size
        mask = Image.new("L", (width, height))
        draw = ImageDraw.Draw(mask)

        # Determine the height where the blur should start fading out
        blur_start_height = int(height * (1 - blur_height_ratio))  # Start point for no blur

        # Draw the gradient from white (255) at the bottom to black (0) at blur_start_height
        for y in range(height):
            if y >= blur_start_height:
                gradient_value = 0  # No blur above this point
            else:
                # Transition from full blur at the bottom to no blur at blur_start_height
                gradient_value = int(255 * (1 - (y / blur_start_height)))
            draw.line((0, y, width, y), fill=gradient_value)

        # Composite the original and blurred images using the mask
        blended_image = Image.composite(image, blurred_image, mask)
        
        return blended_image

# Add rounded corners
def add_rounded_corners(image, radius):
    # Create a mask for rounded corners
    mask = Image.new("L", image.size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle(
        (0, 0) + image.size, radius=radius, fill=255
    )
        
    # Apply the mask to create rounded corners
    rounded_image = ImageOps.fit(image, mask.size, centering=(0.5, 0.5))
    rounded_image.putalpha(mask)
    return rounded_image