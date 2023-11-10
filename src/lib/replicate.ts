/* eslint-disable @typescript-eslint/no-shadow, no-await-in-loop, no-constant-condition */

const prediction = async <T>(otps: {
  version: string;
  input: any;
}): Promise<T | null> => {
  const baseUrl = 'https://api.replicate.com/v1';

  const headers = new Headers();
  headers.append('Content-Type', 'application/json');
  headers.append('Authorization', `Token ${process.env.REPLICATE_API_TOKEN}`);

  const res = await fetch(`${baseUrl}/predictions`, {
    method: 'post',
    headers,
    body: JSON.stringify(otps),
  });

  if (!res.ok) {
    throw new Error();
  }

  const { id, status } = (await res.json()) as { id: string; status: string };

  if (status !== 'starting') {
    throw new Error();
  }

  let result: T | null = null;

  while (true) {
    await new Promise((resolve) => {
      setTimeout(resolve, 2000);
    });

    const res = await fetch(`${baseUrl}/predictions/${id}`, {
      method: 'post',
      headers,
      body: JSON.stringify({}),
    });

    if (!res.ok) {
      throw new Error();
    }

    const { status, output } = (await res.json()) as {
      status: string;
      output: any;
    };

    if (status === 'succeeded') {
      result = output as T;

      break;
    }

    if (status === 'failed' || status === 'canceled') {
      break;
    }
  }

  return result;
};

export { prediction };
