import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

export async function fetchRevenue() {
  try {
    // Artificially delay a response for demo purposes.
    // Don't do this in production :)

    console.log('Fetching revenue data...');
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const data = await prisma.revenue.findMany();
    console.log('Data fetched');
    return data;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch revenue data.');
  }
}

export async function fetchLatestInvoices() {
  try {
    const data = await prisma.invoices.findMany({
      orderBy: {
        date: 'desc',
      },
      take: 5,
      include: {
        customer: true,
      },
    });

    return data.map((inv) => {
      return {
        ...inv,
        amount: '$' + inv.amount / 100,
      };
    });
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch the latest invoices.');
  }
}

export async function fetchCardData() {
  try {
    // You can probably combine these into a single SQL query
    // However, we are intentionally splitting them to demonstrate
    // how to initialize multiple queries in parallel with JS.
    const invoiceCountPromise = prisma.invoices.count();
    const customerCountPromise = prisma.customers.count();
    const invoiceStatusPromise = prisma.invoices.findMany({
      select: {
        status: true,
      },
    });

    const data = await Promise.all([
      invoiceCountPromise,
      customerCountPromise,
      invoiceStatusPromise,
    ]);

    const numberOfInvoices = Number(data[0] ?? '0');
    const numberOfCustomers = Number(data[1] ?? '0');

    const tpi = await prisma.invoices.findMany({
      where: {
        status: 'paid',
      },
    });

    const totalPaidInvoices =
      '$' + tpi.reduce((acc, actualValue) => acc + actualValue.amount, 0) / 100;
    const tPenInv = await prisma.invoices.findMany({
      where: {
        status: 'pending',
      },
    });
    const totalPendingInvoices =
      '$' + tPenInv.reduce((acc, val) => acc + val.amount, 0) / 100;
    return {
      numberOfCustomers,
      numberOfInvoices,
      totalPaidInvoices,
      totalPendingInvoices,
    };
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch card data.');
  }
}

const ITEMS_PER_PAGE = 6;

export async function fetchFilteredInvoices(
  query: string,
  currentPage: number
) {
  // const offset = (currentPage - 1) * ITEMS_PER_PAGE;

  try {
    // Handle the case where the query is empty
    let filteredInvoices;
    if (query.length === 0) {
      filteredInvoices = await prisma.invoices.findMany({
        include: {
          customer: true,
        },
        orderBy: {
          date: 'desc',
        },
        skip: (currentPage - 1) * ITEMS_PER_PAGE,
        take: ITEMS_PER_PAGE,
      });
    } else {
      filteredInvoices = await prisma.invoices.findMany({
        where: {
          OR: [
            {
              customer: {
                name: {
                  contains: query,
                },
              },
            },
            {
              customer: {
                email: {
                  contains: query,
                },
              },
            },
            {
              status: {
                contains: query,
              },
            },
          ],
        },
        include: {
          customer: true,
        },
        orderBy: {
          date: 'desc',
        },
        skip: (currentPage - 1) * ITEMS_PER_PAGE,
        take: ITEMS_PER_PAGE,
      });
    }

    return filteredInvoices;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch invoices.');
  }
}

export async function fetchInvoicesPages(query: string) {
  try {
    // Handle the case where the query is empty
    let filteredInvoices;
    if (query.length === 0) {
      filteredInvoices = await prisma.invoices.count();
    } else {
      filteredInvoices = await prisma.invoices.count({
        where: {
          OR: [
            {
              customer: {
                name: {
                  contains: query,
                },
              },
            },
            {
              customer: {
                email: {
                  contains: query,
                },
              },
            },
            {
              status: {
                contains: query,
              },
            },
          ],
        },
      });
    }

    return Math.ceil(filteredInvoices / ITEMS_PER_PAGE);
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch invoices.');
  }
}

export async function fetchInvoiceById(id: string) {
  try {
    const data = await prisma.invoices.findFirst({
      where: {
        id,
      },
    });
    if (!data) {
      return;
    }

    const invoice = {
      ...data,
      // Convert amount from cents to dollars
      amount: data.amount / 100,
    };

    return invoice;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch invoice.');
  }
}

export async function fetchCustomers() {
  try {
    const data = await prisma.customers.findMany();
    return data;
  } catch (err) {
    console.error('Database Error:', err);
    throw new Error('Failed to fetch all customers.');
  }
}

export async function fetchFilteredCustomers(query: string) {
  try {
    const data = await prisma.customers.findMany({
      where: {
        OR: [
          {
            name: {
              contains: query,
            },
          },
          {
            email: {
              contains: query,
            },
          },
        ],
      },
    });

    const customers = data.map((customer) => ({
      ...customer,
    }));

    return customers;
  } catch (err) {
    console.error('Database Error:', err);
    throw new Error('Failed to fetch customer table.');
  }
}
