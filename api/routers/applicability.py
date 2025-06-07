import json
import tempfile
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse
import pandas as pd

from ..core.applicability_logic import (
    taxonomy, ner, temporal, negation, coreference, srl, logic, vocab, fairness, robustness, check_applicability
)

router = APIRouter()

perturbation_function_map = {
    "Taxonomy": taxonomy,
    "NER": ner,
    "Temporal": temporal,
    "Negation": negation,
    "Coreference": coreference,
    "SRL": srl,
    "Logic": logic,
    "Vocabulary": vocab,
    "Fairness": fairness,
    "Robustness": robustness
}


@router.post("/applicability")
async def process_applicability(request: Request):
    try:
        raw_body = await request.body()
        # print("Raw request body:", raw_body)
        payload = await request.json()
        # print("Parsed payload keys:", payload.keys())

        file_name = payload.get("fileName") or payload.get("filename")
        csv_content = payload.get("csvContent") or payload.get("csvcontent")
        questions = payload.get("questions")
        perturbation_names = payload.get("perturbations")

        # print("Extracted values:")
        # print(f"file_name: {file_name}")
        # print(
        #     f"csv_content length: {len(csv_content) if csv_content else 'None'}")

        if not file_name or not csv_content:
            print(
                f"Missing required fields - file_name: {bool(file_name)}, csv_content: {bool(csv_content)}")
            raise HTTPException(
                status_code=400,
                detail=f"CSV content or file name missing. Received fields: {list(payload.keys())}"
            )

        functions_to_use = []
        # print(f"Functions to use: {[f.__name__ for f in functions_to_use]}")
        # print(f"Perturbation names received: {perturbation_names}")
        for name in perturbation_names:
            # Convert name to lowercase to match dictionary keys
            func = perturbation_function_map.get(name)
            if not func:
                print(f"Unknown perturbation: {name}")
                raise HTTPException(
                    status_code=400, detail=f"Unknown perturbation: {name}")
            functions_to_use.append(func)

        with tempfile.NamedTemporaryFile(delete=False, mode='w', suffix='_' + file_name) as tmp:
            tmp.write(csv_content)
            tmp_path = tmp.name

        result_json_str = check_applicability(tmp_path, functions_to_use)
        try:
            df = pd.read_csv(tmp_path)
            # print(f"CSV columns: {df.columns.tolist()}")
            # print(f"CSV row count: {len(df)}")
        except Exception as e:
            print(f"Error reading CSV: {str(e)}")
        result = json.loads(result_json_str)

        # Add debugging to see the structure
        # print("Result structure:", json.dumps(result, indent=2))

        return JSONResponse(content=result)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON payload.")
    except Exception as e:
        print(f"Exception in process_applicability: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
