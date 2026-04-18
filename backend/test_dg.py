import asyncio
import httpx

async def main():
    print("Testing DG API...")
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://api.deepgram.com/v1/listen?model=general&punctuate=true&diarize=true",
                content=b'RIFF$\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00D\xac\x00\x00\x88X\x01\x00\x02\x00\x10\x00data\x00\x00\x00\x00',
                headers={"Authorization": "Token 8d57f094bf8e94df278e67b5efd374461c32d84d", "Content-Type": "audio/wav"},
                timeout=10.0
            )
            print(resp.status_code, resp.text)
    except Exception as e:
        import traceback
        traceback.print_exc()

asyncio.run(main())
