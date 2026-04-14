import { NextResponse } from "next/server";

export function ok<T>(data: T): NextResponse {
  return NextResponse.json(data);
}

export function created<T>(data: T): NextResponse {
  return NextResponse.json(data, { status: 201 });
}

export function fail(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

export function notFound(message = "Not found"): NextResponse {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function unauthorized(message = "Authentication required"): NextResponse {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbidden(message = "Forbidden"): NextResponse {
  return NextResponse.json({ error: message }, { status: 403 });
}
