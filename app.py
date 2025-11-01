from flask import Flask, request, send_file
import pandas as pd
import os
from io import BytesIO

app = Flask(__name__)

@app.route('/')
def index():
    return send_file('index.html')

@app.route('/concatenate', methods=['POST'])
def concatenate_files():
    if 'files' not in request.files:
        return 'No files uploaded', 400
    
    files = request.files.getlist('files')
    if len(files) == 0:
        return 'No files selected', 400
    
    dataframes = []
    
    for file in files:
        try:
            if file.filename.endswith('.csv'):
                df = pd.read_csv(file)
            else:
                df = pd.read_excel(file)
            dataframes.append(df)
        except Exception as e:
            return f'Error reading {file.filename}: {str(e)}', 400
    
    # Check if all dataframes have same columns
    if len(dataframes) > 1:
        first_columns = set(dataframes[0].columns)
        for i, df in enumerate(dataframes[1:], 1):
            if set(df.columns) != first_columns:
                return f'File {i+1} has different columns. All files must have same headings.', 400
    
    # Concatenate all dataframes
    try:
        combined_df = pd.concat(dataframes, ignore_index=True)
    except Exception as e:
        return f'Error concatenating files: {str(e)}', 400
    
    # Create output in memory
    output = BytesIO()
    with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
        combined_df.to_excel(writer, index=False, sheet_name='Combined Data')
    output.seek(0)
    
    return send_file(
        output,
        as_attachment=True,
        download_name='output.xlsx',
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )

if __name__ == '__main__':
    app.run(debug=True)