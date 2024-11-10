import os
import subprocess

def application(environ, start_response):
    # Start Node.js application
    process = subprocess.Popen(['./start.sh'])

    status = '200 OK'
    response_headers = [('Content-type', 'text/plain')]
    start_response(status, response_headers)
    return [b'Application started']
