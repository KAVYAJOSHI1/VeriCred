import torch
import torch.nn as nn
import torch.optim as optim
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
import onnx
import json
import os

# 1. Define the Model
class CreditScoreModel(nn.Module):
    def __init__(self, input_dim):
        super(CreditScoreModel, self).__init__()
        self.fc1 = nn.Linear(input_dim, 10)
        self.relu = nn.ReLU()
        self.fc2 = nn.Linear(10, 1)
        self.sigmoid = nn.Sigmoid()

    def forward(self, x):
        out = self.fc1(x)
        out = self.relu(out)
        out = self.fc2(out)
        out = self.sigmoid(out)
        return out

# 2. Generate Synthetic Data
def generate_data(num_samples=1000):
    np.random.seed(42)
    # Features: Age, Income, Debt, Credit History Length, Number of Open Accounts
    # Simple logic: High income + low debt + long history = good score (1)
    
    age = np.random.randint(18, 70, num_samples)
    income = np.random.randint(20000, 150000, num_samples)
    debt = np.random.randint(0, 50000, num_samples)
    history = np.random.randint(0, 30, num_samples)
    open_acc = np.random.randint(1, 10, num_samples)
    
    X = np.stack([age, income, debt, history, open_acc], axis=1)
    
    # Target rule (simplified)
    score = (income * 0.4) - (debt * 0.5) + (history * 500)
    y = (score > np.median(score)).astype(int)
    
    return X, y

def main():
    print("Generating data...")
    X, y = generate_data()
    
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    # Save scaler params
    scaler_params = {
        "mean": scaler.mean_.tolist(),
        "scale": scaler.scale_.tolist()
    }
    with open("ai/scaler_params.json", "w") as f:
        json.dump(scaler_params, f)
    print("Scaler params saved to ai/scaler_params.json")
    
    X_tensor = torch.tensor(X_scaled, dtype=torch.float32)
    y_tensor = torch.tensor(y, dtype=torch.float32).unsqueeze(1)
    
    X_train, X_test, y_train, y_test = train_test_split(X_tensor, y_tensor, test_size=0.2, random_state=42)
    
    print("Training model...")
    model = CreditScoreModel(input_dim=5)
    criterion = nn.BCELoss()
    optimizer = optim.Adam(model.parameters(), lr=0.01)
    
    epochs = 100
    for epoch in range(epochs):
        optimizer.zero_grad()
        outputs = model(X_train)
        loss = criterion(outputs, y_train)
        loss.backward()
        optimizer.step()
        
        if (epoch+1) % 10 == 0:
            print(f'Epoch [{epoch+1}/{epochs}], Loss: {loss.item():.4f}')
            
    # Evaluate
    with torch.no_grad():
        outputs = model(X_test)
        predicted = (outputs > 0.5).float()
        accuracy = (predicted == y_test).sum() / y_test.shape[0]
        print(f'Accuracy: {accuracy.item():.4f}')
        
    # Export to ONNX
    print("Exporting to ONNX...")
    dummy_input = torch.randn(1, 5, requires_grad=True)
    torch.onnx.export(model,               # model being run
                      dummy_input,         # model input (or a tuple for multiple inputs)
                      "ai/credit_model.onnx", # where to save the model (can be a file or file-like object)
                      export_params=True,  # store the trained parameter weights inside the model file
                      opset_version=10,    # the ONNX version to export the model to
                      do_constant_folding=True,  # whether to execute constant folding for optimization
                      input_names = ['input'],   # the model's input names
                      output_names = ['output'], # the model's output names
                      dynamic_axes={'input' : {0 : 'batch_size'},    # variable length axes
                                    'output' : {0 : 'batch_size'}})
    print("Model exported to credit_model.onnx")

if __name__ == "__main__":
    main()
