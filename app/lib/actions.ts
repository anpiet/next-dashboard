'use server';
import { z } from 'zod';
import { prisma } from './data';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { signIn } from '@/auth';
import { AuthError } from 'next-auth';

export type State = {
  errors?: {
    customerId?: string[];
    amount?: string[];
    status?: string[];
  };
  message?: string | null;
};

const FormSchema = z.object({
  id: z.string(),
  customerId: z.string({
    message: 'Please select a customer.',
  }),
  amount: z.coerce
    .number()
    .gt(0, { message: 'Please enter an amount greater than $0' }),
  status: z.enum(['pending', 'paid'], {
    message: 'Please choose status',
  }),
  date: z.string(),
});

const CreateInvoice = FormSchema.omit({ id: true, date: true });

export async function createInvoice(prevState: State, formData: FormData) {
  const rawFormData = Object.fromEntries(formData.entries());
  const validatedFields = CreateInvoice.safeParse(rawFormData);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Create Invoice.',
    };
  }
  const { customerId, amount, status } = validatedFields.data;
  const amountInCents = amount * 100;

  try {
    await prisma.invoices.create({
      data: {
        customer_id: customerId,
        amount: amountInCents,
        status,
        date: new Date(),
      },
    });
  } catch (e) {
    console.error('Database Error:', e);
    throw new Error('Failed to create new invoice.');
  }

  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}

// Use Zod to update the expected types
const UpdateInvoice = FormSchema.omit({ id: true, date: true });

// ...

export async function updateInvoice(
  id: string,
  prevState: State,
  formData: FormData
) {
  const rawFormData = Object.fromEntries(formData.entries());
  const validatedFields = UpdateInvoice.safeParse(rawFormData);
  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Update Invoice.',
    };
  }
  const { customerId, amount, status } = validatedFields.data;
  const amountInCents = amount * 100;
  try {
    await prisma.invoices.update({
      where: {
        id,
      },
      data: {
        customer_id: customerId,
        amount: amountInCents,
        status,
      },
    });
  } catch (e) {
    console.error('Database Error:', e);
    throw new Error('Failed to update invoice');
  }

  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}

export const deleteInvoice = async (id: string) => {
  try {
    await prisma.invoices.delete({
      where: {
        id,
      },
    });
  } catch (e) {
    console.error('Database Error:', e);
    throw new Error('Failed to delete invoice');
  }

  revalidatePath('/dashboard/invoices');
};

export async function addToCart(prevState: any, queryData: FormData) {
  const itemID = queryData.get('itemID');
  if (itemID === '1') {
    return 'Added to cart';
  } else {
    return "Couldn't add to cart: the item is sold out.";
  }
}

export async function authenticate(
  prevState: string | undefined,
  formData: FormData
) {
  try {
    await signIn('credentials', formData);
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return 'Invalid credentials.';
        default:
          return 'Something went wrong.';
      }
    }
    throw error;
  }
}
