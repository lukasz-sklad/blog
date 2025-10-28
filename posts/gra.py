import random

# 1. Ustawienia początkowe
sekretna_liczba = random.randint(1, 100)

print("--- Witaj w grze 'Zgadnij Liczbę'! ---")
print("Pomyślałem sobie liczbę od 1 do 100. Spróbuj ją odgadnąć.")

# 2. Główna pętla gry
while True:
    # 3. Pobieranie danych od gracza z obsługą błędów
    try:
        strzal_str = input("Twoja propozycja: ")
        strzal_int = int(strzal_str)

    except ValueError:
        print("To nie jest liczba! Spróbuj ponownie.")
        continue # Wracamy na początek pętli

    # 4. Logika porównania i wskazówki
    if strzal_int < sekretna_liczba:
        print("Za mało! Spróbuj wyżej. 🔼")
    elif strzal_int > sekretna_liczba:
        print("Za dużo! Spróbuj niżej. 🔽")
    else:
        print(f"\nBrawo! Wygrałeś! Sekretna liczba to rzeczywiście {sekretna_liczba}. 🏆")
        break # Zakończenie gry

print("--- Dziękuję za grę! ---")
