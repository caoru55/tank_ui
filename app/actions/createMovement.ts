"use server";

type CreateMovementInput = {
  fk_tanks: string;
  operation: string;
  fk_customers: number;
  token: string;
};

export async function createMovement({
  fk_tanks,
  operation,
  fk_customers,
  token,
}: CreateMovementInput) {
  const res = await fetch("http://163.44.121.247:5000/api/movements", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      fk_tanks,
      operation,
      fk_customers,
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Movement creation failed: ${err}`);
  }

  return res.json();
}