import json
import urllib.request
import urllib.error

for path, method, body in [
    ('/health', 'GET', None),
    ('/auth/login', 'POST', {'email': 'admin@vendorbridge.com', 'password': 'Password@123'})
]:
    url = 'http://localhost:5000' + path
    req = urllib.request.Request(url, method=method)
    req.add_header('Accept', 'application/json')
    if body is not None:
        data = json.dumps(body).encode('utf-8')
        req.add_header('Content-Type', 'application/json')
        req.data = data
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            print(path, resp.status)
            print(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        print(path, 'HTTP', e.code)
        try:
            print(e.read().decode('utf-8'))
        except Exception:
            pass
    except Exception as e:
        print(path, 'ERR', e)
