import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { getApiOrSessionUser } from '@/lib/api-auth-keys'
import { computeAmountInOrgCurrency } from '@/lib/org-currency'

/**
 * @swagger
 * /api/sales:
 *   get:
 *     operationId: listSales
 *     tags:
 *       - Sales
 *     summary: List sales
 *     description: List sales for the authenticated user's organization with optional filters.
 *     security:
 *       - stackSession: []
 *     parameters:
 *       - in: query
 *         name: project_id
 *         required: false
 *         schema:
 *           type: string
 *       - in: query
 *         name: cycle_id
 *         required: false
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         required: false
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: string
 *           default: '100'
 *     responses:
 *       200:
 *         description: Sales fetched successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 sales:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Sale'
 *       401:
 *         description: API key required.
 *   post:
 *     operationId: createSale
 *     tags:
 *       - Sales
 *     summary: Create a new sale
 *     security:
 *       - stackSession: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               project_id:
 *                 type: integer
 *                 nullable: true
 *               cycle_id:
 *                 type: integer
 *                 nullable: true
 *               product_id:
 *                 type: integer
 *                 nullable: true
 *               variant_id:
 *                 type: integer
 *                 nullable: true
 *               customer:
 *                 type: string
 *                 nullable: true
 *               quantity:
 *                 type: number
 *               unit_cost:
 *                 type: number
 *                 nullable: true
 *               price:
 *                 type: number
 *               status:
 *                 type: string
 *                 nullable: true
 *               sale_date:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *               cash_at_hand:
 *                 type: number
 *                 nullable: true
 *               balance:
 *                 type: number
 *                 nullable: true
 *             required:
 *               - quantity
 *               - price
 *     responses:
 *       200:
 *         description: Sale created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 sale:
 *                   $ref: '#/components/schemas/Sale'
 *       401:
 *         description: API key required.
 *   put:
 *     operationId: updateSale
 *     tags:
 *       - Sales
 *     summary: Update an existing sale
 *     security:
 *       - stackSession: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id:
 *                 type: integer
 *               project_id:
 *                 type: integer
 *                 nullable: true
 *               cycle_id:
 *                 type: integer
 *                 nullable: true
 *               product_id:
 *                 type: integer
 *                 nullable: true
 *               variant_id:
 *                 type: integer
 *                 nullable: true
 *               customer:
 *                 type: string
 *                 nullable: true
 *               quantity:
 *                 type: number
 *               unit_cost:
 *                 type: number
 *                 nullable: true
 *               price:
 *                 type: number
 *               status:
 *                 type: string
 *                 nullable: true
 *               sale_date:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *               cash_at_hand:
 *                 type: number
 *                 nullable: true
 *               balance:
 *                 type: number
 *                 nullable: true
 *             required:
 *               - id
 *               - quantity
 *               - price
 *     responses:
 *       200:
 *         description: Sale updated successfully.
 *       401:
 *         description: API key required.
 *   delete:
 *     operationId: deleteSale
 *     tags:
 *       - Sales
 *     summary: Delete a sale
 *     security:
 *       - stackSession: []
 *     parameters:
 *       - in: query
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Sale deleted successfully.
 *       401:
 *         description: API key required.
 */

export async function GET(request: Request) {
  try {
    const user = await getApiOrSessionUser(request as NextRequest)
    if (!user?.organizationId) {
      return NextResponse.json({ status: 'error', message: 'API key required' }, { status: 401 })
    }
    const { organizationId } = user

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('project_id')
    const cycleId = searchParams.get('cycle_id')
    const status = searchParams.get('status')
    const limit = searchParams.get('limit') || '100'

    let query = 'SELECT * FROM sales WHERE organization_id = $1'
    const params: any[] = [organizationId]
    let paramCount = 1

    if (user.role !== 'admin') {
      if (projectId) {
        const access = await db.query(
          `
          SELECT 1
            FROM project_assignments pa
           WHERE pa.project_id = $1 AND pa.user_id = $2
          UNION
          SELECT 1
            FROM project_assignments pa
            JOIN team_members tm ON tm.team_id = pa.team_id
           WHERE pa.project_id = $1 AND tm.user_id = $2
           LIMIT 1
          `,
          [projectId, user.id],
        )

        if (!access.rows.length) {
          return NextResponse.json({ status: 'error', message: 'Forbidden' }, { status: 403 })
        }
      }

      paramCount++
      query += ` AND project_id IN (
        SELECT pa.project_id FROM project_assignments pa WHERE pa.user_id = $${paramCount}
        UNION
        SELECT pa.project_id FROM project_assignments pa JOIN team_members tm ON tm.team_id = pa.team_id WHERE tm.user_id = $${paramCount}
      )`
      params.push(user.id)
    }

    if (projectId) {
      paramCount++
      query += ` AND project_id = $${paramCount}`
      params.push(projectId)
    }

    if (cycleId) {
      paramCount++
      query += ` AND cycle_id = $${paramCount}`
      params.push(cycleId)
    }

    if (status) {
      paramCount++
      query += ` AND status = $${paramCount}`
      params.push(status)
    }

    query += ` ORDER BY id DESC LIMIT $${paramCount + 1}`
    params.push(parseInt(limit, 10))

    const result = await db.query(query, params)

    return NextResponse.json({
      status: 'success',
      sales: result.rows,
    })
  } catch (error) {
    console.error('Sales GET error:', error)
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to fetch sales',
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getApiOrSessionUser(request);
    if (!user?.organizationId) {
      return NextResponse.json({ status: 'error', message: 'API key required' }, { status: 401 });
    }
    const { organizationId, id: userId } = user;

    const body = await request.json();
    const { project_id, cycle_id, product_id, variant_id, customer, quantity, unit_cost, price, status, sale_date, cash_at_hand, balance } = body;

    if (user.role !== 'admin') {
      if (!project_id) {
        return NextResponse.json({ status: 'error', message: 'Forbidden' }, { status: 403 });
      }

      const access = await db.query(
        `
        SELECT 1
          FROM project_assignments pa
         WHERE pa.project_id = $1 AND pa.user_id = $2
        UNION
        SELECT 1
          FROM project_assignments pa
          JOIN team_members tm ON tm.team_id = pa.team_id
         WHERE pa.project_id = $1 AND tm.user_id = $2
         LIMIT 1
        `,
        [project_id, userId],
      );

      if (!access.rows.length) {
        return NextResponse.json({ status: 'error', message: 'Forbidden' }, { status: 403 });
      }
    }

    const safeQuantity = typeof quantity === 'number' ? quantity : parseInt(quantity || '0', 10) || 0;
    const safeUnitCost = typeof unit_cost === 'number' ? unit_cost : parseFloat(unit_cost || '0') || 0;
    const safePrice = typeof price === 'number' ? price : parseFloat(price || '0') || 0;
    const safeCashAtHand = typeof cash_at_hand === 'number' ? cash_at_hand : parseFloat(cash_at_hand || '0') || 0;
    const safeBalance = typeof balance === 'number' ? balance : parseFloat(balance || '0') || 0;
    const amount = safeQuantity * safePrice;
    const amountOrgCcy = await computeAmountInOrgCurrency(organizationId, project_id || null, amount);

    let customerId: number | null = null;
    if (customer && typeof customer === 'string' && customer.trim()) {
      const customerRes = await db.query(
        `INSERT INTO customers (name, organization_id)
         VALUES ($1, $2)
         ON CONFLICT (organization_id, name) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [customer.trim(), organizationId]
      );
      customerId = customerRes.rows[0]?.id ?? null;
    }

    // Insert the sale
    const saleResult = await db.query(
      'INSERT INTO sales (project_id, cycle_id, product_id, variant_id, customer_name, customer_id, quantity, unit_cost, price, status, cash_at_hand, balance, amount, amount_org_ccy, sale_date, organization_id, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17) RETURNING *',
      [
        project_id || null,
        cycle_id || null,
        product_id || null,
        variant_id || null,
        customer || null,
        customerId,
        safeQuantity,
        safeUnitCost,
        safePrice,
        status || 'pending',
        safeCashAtHand,
        safeBalance,
        amount,
        amountOrgCcy,
        sale_date || null,
        organizationId,
        userId
      ]
    );

    // Reduce stock. If we have both product_id and variant_id, update both.
    // If only one is present, still update whichever we can.
    if (safeQuantity > 0) {
      if (product_id) {
        const productUpdate = await db.query(
          'UPDATE products SET quantity_in_stock = quantity_in_stock - $1 WHERE id = $2 AND organization_id = $3 RETURNING id',
          [safeQuantity, product_id, organizationId]
        );
        if (productUpdate.rows.length === 0) {
          throw new Error('Failed to update product stock. Product not found or permission denied.');
        }
      }

      if (variant_id) {
        const variantUpdate = await db.query(
          'UPDATE product_variants SET quantity_in_stock = quantity_in_stock - $1 WHERE id = $2 RETURNING id',
          [safeQuantity, variant_id]
        );
        if (variantUpdate.rows.length === 0) {
          throw new Error('Failed to update product variant stock. Variant not found.');
        }
      }
    }

    return NextResponse.json({ status: 'success', sale: saleResult.rows[0] });

  } catch (error) {
    console.error('Sale creation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create sale';
    return NextResponse.json({ status: 'error', message: errorMessage }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getApiOrSessionUser(request);
    if (!user?.organizationId) {
      return NextResponse.json({ status: 'error', message: 'API key required' }, { status: 401 });
    }
    const { organizationId } = user;

    const body = await request.json();
    const { id, project_id, cycle_id, product_id, variant_id, customer, quantity, unit_cost, price, status, sale_date, cash_at_hand, balance } = body;

    // Get the original sale to calculate stock adjustment
    const originalSaleResult = await db.query('SELECT quantity, product_id, variant_id, customer_id, project_id FROM sales WHERE id = $1 AND organization_id = $2', [id, organizationId]);
    if (originalSaleResult.rows.length === 0) {
      throw new Error('Sale not found');
    }
    const originalSale = originalSaleResult.rows[0];

    const originalQuantity = originalSale.quantity;
    const originalProductId = originalSale.product_id as number | null;
    const originalVariantId = originalSale.variant_id as number | null;
    const originalCustomerId = originalSale.customer_id as number | null;

    if (user.role !== 'admin') {
      const currentProjectId = originalSale.project_id as number | null;
      const targetProjectId = (project_id ?? currentProjectId) as number | null;
      if (!targetProjectId) {
        return NextResponse.json({ status: 'error', message: 'Forbidden' }, { status: 403 });
      }

      const access = await db.query(
        `
        SELECT 1
          FROM project_assignments pa
         WHERE pa.project_id = $1 AND pa.user_id = $2
        UNION
        SELECT 1
          FROM project_assignments pa
          JOIN team_members tm ON tm.team_id = pa.team_id
         WHERE pa.project_id = $1 AND tm.user_id = $2
         LIMIT 1
        `,
        [targetProjectId, user.id],
      );

      if (!access.rows.length) {
        return NextResponse.json({ status: 'error', message: 'Forbidden' }, { status: 403 });
      }
    }

    const safeQuantity = typeof quantity === 'number' ? quantity : parseInt(quantity || '0', 10) || 0;
    const quantityDifference = safeQuantity - originalQuantity;

    const safeUnitCost = typeof unit_cost === 'number' ? unit_cost : parseFloat(unit_cost || '0') || 0;
    const safePrice = typeof price === 'number' ? price : parseFloat(price || '0') || 0;
    const safeCashAtHand = typeof cash_at_hand === 'number' ? cash_at_hand : parseFloat(cash_at_hand || '0') || 0;
    const safeBalance = typeof balance === 'number' ? balance : parseFloat(balance || '0') || 0;
    const amount = safeQuantity * safePrice;
    const amountOrgCcy = await computeAmountInOrgCurrency(organizationId, project_id || null, amount);

    let customerId: number | null = originalCustomerId;
    if (customer && typeof customer === 'string' && customer.trim()) {
      const customerRes = await db.query(
        `INSERT INTO customers (name, organization_id)
         VALUES ($1, $2)
         ON CONFLICT (organization_id, name) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [customer.trim(), organizationId]
      );
      customerId = customerRes.rows[0]?.id ?? null;
    }

    // Update the sale
    const saleResult = await db.query(
      'UPDATE sales SET project_id = $1, cycle_id = $2, product_id = $3, variant_id = $4, customer_name = $5, customer_id = $6, quantity = $7, unit_cost = $8, price = $9, status = $10, cash_at_hand = $11, balance = $12, amount = $13, amount_org_ccy = $14, sale_date = $15 WHERE id = $16 AND organization_id = $17 RETURNING *',
      [
        project_id || null,
        cycle_id || null,
        product_id || null,
        variant_id || null,
        customer || null,
        customerId,
        safeQuantity,
        safeUnitCost,
        safePrice,
        status || 'pending',
        safeCashAtHand,
        safeBalance,
        amount,
        amountOrgCcy,
        sale_date || null,
        id,
        organizationId
      ]
    );

    // Adjust stock based on changes.
    // If both product and variant are unchanged, apply the quantity difference only.
    if (originalProductId === product_id && originalVariantId === variant_id) {
      if (quantityDifference !== 0 && product_id) {
        const productUpdate = await db.query(
          'UPDATE products SET quantity_in_stock = quantity_in_stock - $1 WHERE id = $2 AND organization_id = $3 RETURNING id',
          [quantityDifference, product_id, organizationId]
        );
        if (productUpdate.rows.length === 0) {
          throw new Error('Failed to update product stock. Product not found or permission denied.');
        }

        if (variant_id) {
          const variantUpdate = await db.query(
            'UPDATE product_variants SET quantity_in_stock = quantity_in_stock - $1 WHERE id = $2 RETURNING id',
            [quantityDifference, variant_id]
          );
          if (variantUpdate.rows.length === 0) {
            throw new Error('Failed to update product variant stock. Variant not found.');
          }
        }
      }
    } else {
      // Product and/or variant changed.
      // 1) Restore stock for the original sale.
      if (originalProductId && originalQuantity > 0) {
        const restoreProduct = await db.query(
          'UPDATE products SET quantity_in_stock = quantity_in_stock + $1 WHERE id = $2 AND organization_id = $3 RETURNING id',
          [originalQuantity, originalProductId, organizationId]
        );
        if (restoreProduct.rows.length === 0) {
          throw new Error('Failed to restore stock for the original product.');
        }

        if (originalVariantId) {
          const restoreVariant = await db.query(
            'UPDATE product_variants SET quantity_in_stock = quantity_in_stock + $1 WHERE id = $2 RETURNING id',
            [originalQuantity, originalVariantId]
          );
          if (restoreVariant.rows.length === 0) {
            throw new Error('Failed to restore stock for the original product variant.');
          }
        }
      }

      // 2) Apply stock reduction for the new sale values.
      if (product_id && safeQuantity > 0) {
        const deductProduct = await db.query(
          'UPDATE products SET quantity_in_stock = quantity_in_stock - $1 WHERE id = $2 AND organization_id = $3 RETURNING id',
          [safeQuantity, product_id, organizationId]
        );
        if (deductProduct.rows.length === 0) {
          throw new Error('Failed to deduct stock for the new product.');
        }

        if (variant_id) {
          const deductVariant = await db.query(
            'UPDATE product_variants SET quantity_in_stock = quantity_in_stock - $1 WHERE id = $2 RETURNING id',
            [safeQuantity, variant_id]
          );
          if (deductVariant.rows.length === 0) {
            throw new Error('Failed to deduct stock for the new product variant.');
          }
        }
      }
    }

    return NextResponse.json({ status: 'success', sale: saleResult.rows[0] });

  } catch (error) {
    console.error('Sale update error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update sale';
    return NextResponse.json({ status: 'error', message: errorMessage }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    const user = await getApiOrSessionUser(request);
    if (!user?.organizationId) {
      return NextResponse.json({ status: 'error', message: 'API key required' }, { status: 401 });
    }
    const { organizationId } = user;

    // Get the sale to restore stock
    const saleResult = await db.query('SELECT product_id, variant_id, quantity, project_id FROM sales WHERE id = $1 AND organization_id = $2', [id, organizationId]);
    if (saleResult.rows.length === 0) {
      throw new Error('Sale not found');
    }
    const { product_id, variant_id, quantity, project_id } = saleResult.rows[0];

    if (user.role !== 'admin') {
      if (!project_id) {
        return NextResponse.json({ status: 'error', message: 'Forbidden' }, { status: 403 });
      }

      const access = await db.query(
        `
        SELECT 1
          FROM project_assignments pa
         WHERE pa.project_id = $1 AND pa.user_id = $2
        UNION
        SELECT 1
          FROM project_assignments pa
          JOIN team_members tm ON tm.team_id = pa.team_id
         WHERE pa.project_id = $1 AND tm.user_id = $2
         LIMIT 1
        `,
        [project_id, user.id],
      );

      if (!access.rows.length) {
        return NextResponse.json({ status: 'error', message: 'Forbidden' }, { status: 403 });
      }
    }

    // Restore stock on the main product row and its specific variant (if any)
    if (product_id && quantity > 0) {
      const updateResult = await db.query(
        'UPDATE products SET quantity_in_stock = quantity_in_stock + $1 WHERE id = $2 AND organization_id = $3 RETURNING id',
        [quantity, product_id, organizationId]
      );
      if (updateResult.rows.length === 0) {
        throw new Error('Failed to restore product stock. Product not found or permission denied.');
      }

      if (variant_id) {
        const variantUpdate = await db.query(
          'UPDATE product_variants SET quantity_in_stock = quantity_in_stock + $1 WHERE id = $2 RETURNING id',
          [quantity, variant_id]
        );
        if (variantUpdate.rows.length === 0) {
          throw new Error('Failed to restore product variant stock. Variant not found or permission denied.');
        }
      }
    }
    
    // Delete the sale
    await db.query('DELETE FROM sales WHERE id = $1 AND organization_id = $2', [id, organizationId]);
    
    return NextResponse.json({ 
      status: 'success', 
      message: 'Sale deleted successfully' 
    });

  } catch (error) {
    console.error('Sale deletion error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete sale';
    return NextResponse.json({ 
      status: 'error', 
      message: errorMessage
    }, { status: 500 });
  }
}