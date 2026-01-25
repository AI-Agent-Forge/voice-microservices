"""
ASR Service Test Script
Run this to test the ASR service functionality
"""

import requests
import json
import time
import sys
from pathlib import Path

# Configuration
ASR_SERVICE_URL = "http://localhost:8001"

def test_health():
    """Test health endpoint"""
    print("\n🔍 Testing Health Endpoint...")
    try:
        response = requests.get(f"{ASR_SERVICE_URL}/health", timeout=10)
        print(f"   Status Code: {response.status_code}")
        print(f"   Response: {json.dumps(response.json(), indent=2)}")
        return response.status_code == 200
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False


def test_detailed_health():
    """Test detailed health endpoint"""
    print("\n🔍 Testing Detailed Health Endpoint...")
    try:
        response = requests.get(f"{ASR_SERVICE_URL}/asr/health", timeout=10)
        print(f"   Status Code: {response.status_code}")
        print(f"   Response: {json.dumps(response.json(), indent=2)}")
        return response.status_code == 200
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False


def test_service_info():
    """Test service info endpoint"""
    print("\n🔍 Testing Service Info Endpoint...")
    try:
        response = requests.get(f"{ASR_SERVICE_URL}/asr/info", timeout=10)
        print(f"   Status Code: {response.status_code}")
        print(f"   Response: {json.dumps(response.json(), indent=2)}")
        return response.status_code == 200
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False


def test_file_upload(audio_path: str):
    """Test file upload endpoint"""
    print(f"\n🎤 Testing File Upload with: {audio_path}")
    
    if not Path(audio_path).exists():
        print(f"   ⚠️ File not found: {audio_path}")
        return False
    
    try:
        with open(audio_path, 'rb') as f:
            files = {'file': (Path(audio_path).name, f, 'audio/wav')}
            data = {'language': 'en'}
            
            start_time = time.time()
            response = requests.post(
                f"{ASR_SERVICE_URL}/asr/process",
                files=files,
                data=data,
                timeout=120
            )
            elapsed = time.time() - start_time
        
        print(f"   Status Code: {response.status_code}")
        print(f"   Processing Time: {elapsed:.2f}s")
        
        if response.status_code == 200:
            result = response.json()
            print(f"   Transcript: {result.get('transcript', 'N/A')}")
            print(f"   Words Count: {len(result.get('words', []))}")
            print(f"   Language: {result.get('language', 'N/A')}")
            print(f"   Model Used: {result.get('model_used', 'N/A')}")
            return True
        else:
            print(f"   ❌ Error: {response.text}")
            return False
            
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False


def test_url_processing(audio_url: str):
    """Test URL processing endpoint"""
    print(f"\n🌐 Testing URL Processing with: {audio_url}")
    
    try:
        payload = {
            "audio_url": audio_url,
            "language": "en"
        }
        
        start_time = time.time()
        response = requests.post(
            f"{ASR_SERVICE_URL}/asr/url",
            json=payload,
            timeout=120
        )
        elapsed = time.time() - start_time
        
        print(f"   Status Code: {response.status_code}")
        print(f"   Processing Time: {elapsed:.2f}s")
        
        if response.status_code == 200:
            result = response.json()
            print(f"   Transcript: {result.get('transcript', 'N/A')}")
            print(f"   Words Count: {len(result.get('words', []))}")
            print(f"   Language: {result.get('language', 'N/A')}")
            return True
        else:
            print(f"   ❌ Error: {response.text}")
            return False
            
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False


def main():
    print("=" * 60)
    print("🎤 ASR Service Test Suite")
    print("=" * 60)
    
    results = []
    
    # Test basic endpoints
    results.append(("Health Check", test_health()))
    results.append(("Detailed Health", test_detailed_health()))
    results.append(("Service Info", test_service_info()))
    
    # Test file upload if audio file provided
    if len(sys.argv) > 1:
        results.append(("File Upload", test_file_upload(sys.argv[1])))
    else:
        print("\n💡 Tip: Provide an audio file path as argument to test file upload")
        print("   Example: python test_asr_service.py /path/to/audio.wav")
    
    # Print summary
    print("\n" + "=" * 60)
    print("📊 Test Summary")
    print("=" * 60)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"   {name}: {status}")
    
    print(f"\n   Total: {passed}/{total} tests passed")
    print("=" * 60)
    
    return 0 if passed == total else 1


if __name__ == "__main__":
    sys.exit(main())
