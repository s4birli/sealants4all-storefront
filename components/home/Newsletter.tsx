"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check, Mail } from "lucide-react";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
});

type FormValues = z.infer<typeof schema>;

export function Newsletter() {
  const [done, setDone] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = () => {
    setDone(true);
    setTimeout(() => {
      setDone(false);
      reset();
    }, 3200);
  };

  return (
    <section className="section">
      <div className="container">
        <div className="newsletter">
          <div>
            <h3>Trade tips, new products, exclusive deals.</h3>
            <p>Monthly. We respect the inbox. Unsubscribe in one click.</p>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <input
              type="email"
              className="input"
              placeholder="you@trade-email.co.uk"
              aria-label="Email address"
              aria-invalid={!!errors.email}
              {...register("email")}
            />
            <button className="btn btn-brand btn-lg" type="submit">
              {done ? (
                <>
                  <Check size={16} strokeWidth={3} /> Subscribed
                </>
              ) : (
                <>
                  <Mail size={16} strokeWidth={2} /> Subscribe
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
