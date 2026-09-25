import asyncio
import websockets

async def test():
    try:
        # Connecting to Traefik directly!
        async with websockets.connect('ws://localhost:8080/ws/test/class-counts/?task_id=2') as ws:
            print("Connected to 8080!")
            res = await ws.recv()
            print("Received:", res)
    except Exception as e:
        print("Error:", e)

asyncio.run(test())
