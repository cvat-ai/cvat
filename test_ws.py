import asyncio
import websockets

async def test():
    uri = "ws://localhost:8080/ws/test/class-counts/?task_id=3"
    try:
        async with websockets.connect(uri, extra_headers={"Origin": "http://localhost:3000"}) as websocket:
            print("Connected! Waiting for message...")
            msg = await websocket.recv()
            print("Received:", msg)
            await websocket.close()
    except Exception as e:
        print(f"Failed: {e}")

asyncio.run(test())
