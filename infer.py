import argparse
import json
from ml import model_registry


def parse_args():
    parser = argparse.ArgumentParser(description="VisionOps Inference Script")
    parser.add_argument("--model-name", type=str, required=True, help="Name of the model (e.g. yolov8n)")
    parser.add_argument("--weights-path", type=str, required=True, help="Path to the custom weights file (e.g. best.pt)")
    parser.add_argument("--source", type=str, required=True, help="Path to the input image or video")
    parser.add_argument("--conf", type=float, default=0.25, help="Confidence threshold")
    
    return parser.parse_args()


def main():
    args = parse_args()
    
    print(f"Loading {args.model_name} from {args.weights_path}...")
    # Default to ultralytics_detector architecture
    detector = model_registry.get_detector("ultralytics_detector")
    detector.load(weights=args.weights_path)
    
    print(f"Running inference on {args.source}...")
    detections = detector.infer(source_path=args.source, conf_threshold=args.conf)
    
    # Print as JSON so it can be parsed by caller (like FastAPI endpoint)
    print("-----JSON_OUTPUT_START-----")
    print(json.dumps(detections))
    print("-----JSON_OUTPUT_END-----")
    
if __name__ == "__main__":
    main()
