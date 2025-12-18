import cv2
import numpy as np
import os
import shutil
import subprocess

# --- KONFIGURACJA ---
FOLDER = "/home/deck/Pictures/swieta/"
RAMKA_PATH = os.path.join(FOLDER, "112.png")
VIDEO_PATH = os.path.join(FOLDER, "113.mp4")
TEMP_DIR = os.path.join(FOLDER, "temp_frames")
OUTPUT_GIF = os.path.join(FOLDER, "finalna_kartka.gif")

TARGET_WIDTH = 800  # Zmniejszymy na koncu, zeby GIF byl lekki
TARGET_FPS = 10
DURATION_SEC = 4 

# Twoje DOKLADNE wspolrzedne dla duzej ramki (3041x2631)
# Ulozylem je geometrycznie (TL, TR, BR, BL)
POINTS_DST = np.float32([
    [842, 366],    # Lewy Gorny (Najmniejszy X, Maly Y)
    [2646, 1023],  # Prawy Gorny (Duzy X, Sredni Y)
    [2277, 2039],  # Prawy Dolny (Duzy X, Duzy Y)
    [474, 1383]    # Lewy Dolny (Maly X, Duzy Y)
])

def main():
    print("--- START (Ramka na Wierzchu - Precyzyjne Punkty) ---")
    
    if os.path.exists(TEMP_DIR): shutil.rmtree(TEMP_DIR)
    os.makedirs(TEMP_DIR)
    
    # 1. Wczytaj Ogromna Ramke
    ramka = cv2.imread(RAMKA_PATH, cv2.IMREAD_UNCHANGED)
    h_orig, w_orig = ramka.shape[:2]
    print(f"Ramka oryginalna: {w_orig}x{h_orig}")
    
    # 2. Wczytaj Wideo
    cap = cv2.VideoCapture(VIDEO_PATH)
    w_vid = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h_vid = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps_orig = cap.get(cv2.CAP_PROP_FPS)

    # Macierz transformacji (Wideo -> Dziura w duzej ramce)
    points_src = np.float32([[0, 0], [w_vid, 0], [w_vid, h_vid], [0, h_vid]])
    matrix = cv2.getPerspectiveTransform(points_src, POINTS_DST)

    skip_step = int(fps_orig / TARGET_FPS)
    frames_to_render = TARGET_FPS * DURATION_SEC
    
    # Oblicz wysokosc docelowa dla malego GIFa
    scale_out = TARGET_WIDTH / w_orig
    h_out = int(h_orig * scale_out)
    
    print(f"Renderowanie {frames_to_render} klatek...")
    
    rendered = 0
    count = 0
    
    while rendered < frames_to_render:
        ret, frame = cap.read()
        if not ret: 
            cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
            continue
            
        if count % skip_step != 0:
            count += 1
            continue
            
        # 1. Wykrzyw Wideo (na duzy format ramki)
        # Dodaj kanal Alpha, zeby tlo bylo przezroczyste
        frame_bgra = cv2.cvtColor(frame, cv2.COLOR_BGR2BGRA)
        warped = cv2.warpPerspective(frame_bgra, matrix, (w_orig, h_orig), 
                                     borderMode=cv2.BORDER_CONSTANT, borderValue=(0,0,0,0))

        # 2. KOMPOZYCJA: RAMKA NA WIERZCHU
        # Output zaczyna sie jako kopia ramki
        canvas = ramka.copy()
        
        # Logika: Tam gdzie ramka jest przezroczysta (dziura), wstawiamy film.
        # Wzor: Wynik = Ramka * AlphaRamki + Wideo * (1 - AlphaRamki)
        
        alpha_ramka = ramka[:, :, 3] / 255.0
        alpha_inv = 1.0 - alpha_ramka
        
        # Obliczamy kolory
        for c in range(3):
            canvas[:, :, c] = (ramka[:, :, c] * alpha_ramka + 
                               warped[:, :, c] * alpha_inv).astype(np.uint8)
        
        # Alpha wyniku: 
        # Jesli wideo jest w dziurze, to alpha=255. Jesli ramka jest lita, alpha=255.
        # Jesli jest przezroczystosc poza ramka I poza wideo -> alpha=0.
        
        alpha_warped = warped[:, :, 3] / 255.0
        # Miejsca gdzie jest wideo I jest dziura w ramce
        video_visible = alpha_inv * alpha_warped
        
        final_alpha = alpha_ramka + video_visible
        # Clip do 1.0
        final_alpha = np.clip(final_alpha, 0.0, 1.0)
        
        canvas[:, :, 3] = (final_alpha * 255).astype(np.uint8)
        
        # 3. ZMNIEJSZ (Dopiero teraz, zeby GIF byl maly)
        output_small = cv2.resize(canvas, (TARGET_WIDTH, h_out), interpolation=cv2.INTER_AREA)
        
        cv2.imwrite(os.path.join(TEMP_DIR, f"frame_{rendered:03d}.png"), output_small)
        
        rendered += 1
        count += 1
        if rendered % 10 == 0: print(f"Klatka {rendered}/{frames_to_render}")

    cap.release()
    
    print("Skladanie GIF (z paleta)...")
    palette_path = os.path.join(TEMP_DIR, "palette.png")
    subprocess.run([
        "ffmpeg", "-y", "-i", os.path.join(TEMP_DIR, "frame_%03d.png"),
        "-filter_complex", "palettegen=reserve_transparent=1", palette_path
    ])
    
    subprocess.run([
        "ffmpeg", "-y", "-framerate", str(TARGET_FPS),
        "-i", os.path.join(TEMP_DIR, "frame_%03d.png"),
        "-i", palette_path,
        "-filter_complex", "[0:v][1:v]paletteuse=alpha_threshold=128",
        "-gifflags", "+transdiff",
        OUTPUT_GIF
    ])
    
    shutil.rmtree(TEMP_DIR)
    print(f"SUKCES! Plik GIF gotowy: {OUTPUT_GIF}")

if __name__ == "__main__":
    main()
