import kagglehub
import shutil
import os

# Download latest version
print("Скачиваем датасет Credit Card Fraud Detection...")
path = kagglehub.dataset_download("mlg-ulb/creditcardfraud")

print("Path to dataset files:", path)

# Move dataset to our data folder
data_folder = "data"
if not os.path.exists(data_folder):
    os.makedirs(data_folder)

# Find CSV file in downloaded path
for file in os.listdir(path):
    if file.endswith('.csv'):
        source_file = os.path.join(path, file)
        dest_file = os.path.join(data_folder, file)
        
        print(f"Копируем {file} в папку data/")
        shutil.copy2(source_file, dest_file)
        print(f"Датасет успешно скопирован: {dest_file}")

print("Готово! Датасет находится в папке data/")