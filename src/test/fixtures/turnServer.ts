import { createServer, type Server, type ServerResponse } from "node:http";

export type TurnServer = {
  server: Server;
  baseUrl: string;
  requestCount: () => number;
};

const streamChunk = (
  response: ServerResponse,
  turn: number,
  delta: object,
  finishReason: "tool_calls" | "stop" | null,
): void => {
  const chunk = {
    id: `completion-${turn}`,
    object: "chat.completion.chunk",
    created: 0,
    model: "test-model",
    choices: [{ index: 0, delta, finish_reason: finishReason }],
  };
  response.write(`data: ${JSON.stringify(chunk)}\n\n`);
};

const writeCompletion = (response: ServerResponse, turn: number): void => {
  response.writeHead(200, { "content-type": "text/event-stream" });
  if (turn === 1) {
    streamChunk(
      response,
      turn,
      {
        role: "assistant",
        tool_calls: [
          {
            index: 0,
            id: "call-1",
            type: "function",
            function: { name: "Echo", arguments: JSON.stringify({ value: "first" }) },
          },
        ],
      },
      null,
    );
    streamChunk(response, turn, {}, "tool_calls");
  } else {
    streamChunk(response, turn, { role: "assistant", content: "finished" }, null);
    streamChunk(response, turn, {}, "stop");
  }
  response.end("data: [DONE]\n\n");
};

export const listenTurnServer = async (): Promise<TurnServer> => {
  let requestCount = 0;
  const server = createServer((request, response) => {
    if (request.url?.includes("/models")) {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ data: [{ id: "test-model", max_model_len: 128000 }] }));
      return;
    }
    if (request.url?.includes("/tokenize")) {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ count: 1 }));
      return;
    }
    if (!request.url?.includes("/chat/completions")) {
      response.writeHead(404);
      response.end();
      return;
    }
    requestCount += 1;
    writeCompletion(response, requestCount);
  });
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to bind turn limit server");
  }
  return {
    server,
    baseUrl: `http://127.0.0.1:${address.port}/v1`,
    requestCount: () => requestCount,
  };
};

export const closeTurnServer = async (server: Server): Promise<void> =>
  new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
