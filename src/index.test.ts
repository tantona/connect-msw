import { createConnectHandler } from "./index";
import { setupServer } from "msw/node";
import { createConnectTransport } from "@connectrpc/connect-web";

import { ElizaService } from "@buf/connectrpc_eliza.connectrpc_es/connectrpc/eliza/v1/eliza_connect";
import { SayRequest, SayResponse } from "@buf/connectrpc_eliza.bufbuild_es/connectrpc/eliza/v1/eliza_pb";
import { Code, ConnectError, createPromiseClient } from "@connectrpc/connect";

const baseUrl = "http://example.com";

describe("createConnectHandler", () => {
  const server = setupServer();
  const client = createPromiseClient(
    ElizaService,
    createConnectTransport({
      baseUrl,
    })
  );

  beforeEach(() => {
    server.resetHandlers();
    server.listen();
  });

  it("no handlers", async () => {
    expect(client.say(new SayRequest({ sentence: "hello!" }))).rejects.toThrow("[unknown] HTTP 405");
  });

  it("registers an rpc handler (async)", async () => {
    server.use(
      createConnectHandler(
        ElizaService,
        "say",
        async (info) => {
          const requestBody = await info.request.json();
          const payload = SayRequest.fromJson(requestBody);

          return new SayResponse({ sentence: payload.sentence });
        },
        {
          baseUrl,
        }
      )
    );

    const got = await client.say(new SayRequest({ sentence: "hello!" }));

    expect(got).toEqual(new SayResponse({ sentence: "hello!" }));
  });

  it("handles errors", async () => {
    server.use(
      createConnectHandler(
        ElizaService,
        "say",
        () => {
          throw new ConnectError("Unauthenticated", Code.Unauthenticated);
        },
        { baseUrl }
      )
    );

    expect(client.say(new SayRequest({ sentence: "hello!" }))).rejects.toThrow("[unauthenticated] HTTP 401");
  });
});
