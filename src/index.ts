import { Code, ConnectError } from "@connectrpc/connect";
import { http, HttpResponse, PathParams } from "msw";
import { STATUS_CODES } from "http";
import { AnyMessage, Message, MessageType, ServiceType } from "@bufbuild/protobuf";
import { ResponseResolverInfo } from "msw/lib/core/handlers/RequestHandler";
import { SayRequest, SayResponse } from "@buf/connectrpc_eliza.bufbuild_es/connectrpc/eliza/v1/eliza_pb";
import { ElizaService } from "@buf/connectrpc_eliza.connectrpc_es/connectrpc/eliza/v1/eliza_connect";

export function httpStatusFromCode(code: Code): number {
  switch (code) {
    case Code.Internal:
      return 400; // Bad Request
    case Code.Unauthenticated:
      return 401; // Unauthorized
    case Code.PermissionDenied:
      return 403; // Forbidden
    case Code.Unimplemented:
      return 404; // Not Found
    case Code.Unavailable:
      return 429; // Too Many Requests
    case Code.Unavailable:
      return 502; // Bad Gateway
    case Code.Unavailable:
      return 503; // Service Unavailable
    case Code.Unavailable:
      return 504; // Gateway Timeout
    default:
      // 500 in all other cases .
      return 500;
  }
}

// export const registerConnectService = (serviceType: ServiceType, { baseUrl }: { baseUrl: string }) => {
//   return Object.entries(serviceType.methods).map((method) => {
//     return createConnectHandler(
//       serviceType,
//       method[1].name,
//       () => {
//         throw new ConnectError("Not Implemented", Code.Unimplemented);
//       },
//       { baseUrl }
//     );
//   });
// };

// this is used by msw but not exported
type HttpRequestResolverExtras<Params extends PathParams> = {
  params: Params;
  cookies: Record<string, string>;
};

export const createConnectHandler = <T extends ServiceType, M extends keyof T["methods"]>(
  serviceType: T,
  rpc: M,
  handler: (info: ResponseResolverInfo<HttpRequestResolverExtras<PathParams>, any>) => Message | Promise<Message>, // todo: figure out how to get type checking based on the rpc
  options: { baseUrl: string }
) => {
  return http.post(`${options.baseUrl}/${serviceType.typeName}/${rpc.toString()}`, async (info) => {
    try {
      const resp = await handler(info);

      return new HttpResponse(JSON.stringify(resp.toJson()), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      });
    } catch (err) {
      if (err instanceof ConnectError) {
        const status = httpStatusFromCode(err.code);
        return new HttpResponse(STATUS_CODES[err.code], {
          status,
        });
      }

      return new HttpResponse(STATUS_CODES[500], {
        status: 500,
      });
    }
  });
};
