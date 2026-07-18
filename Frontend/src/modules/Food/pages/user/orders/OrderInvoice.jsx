import { useParams, Link, useSearchParams } from "react-router-dom"
import { Download, ArrowLeft, Printer } from "lucide-react"
import { useRef, useState, useEffect } from "react"
import AnimatedPage from "@food/components/user/AnimatedPage"
import ScrollReveal from "@food/components/user/ScrollReveal"
import { Button } from "@food/components/ui/button"
import { useOrders } from "@food/context/OrdersContext"
import { useCompanyName } from "@food/hooks/useCompanyName"
import { orderAPI } from "@food/api"
import { jsPDF } from "jspdf"
import { downloadFile } from "@/shared/utils/downloadUtils"

// Helper function for converting numbers to words
function numberToWords(num) {
  const a = ['','One ','Two ','Three ','Four ', 'Five ','Six ','Seven ','Eight ','Nine ','Ten ','Eleven ','Twelve ','Thirteen ','Fourteen ','Fifteen ','Sixteen ','Seventeen ','Eighteen ','Nineteen '];
  const b = ['', '', 'Twenty','Thirty','Forty','Fifty', 'Sixty','Seventy','Eighty','Ninety'];
  
  if ((num = num.toString()).length > 9) return 'overflow';
  let n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return;
  let str = '';
  str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
  str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
  str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
  str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
  str += (n[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) + 'Rupees Only' : 'Rupees Only';
  return str.trim();
}

export default function OrderInvoice() {
  const companyName = useCompanyName()
  const { orderId } = useParams()
  const [searchParams] = useSearchParams()
  const { getOrderById } = useOrders()
  const [order, setOrder] = useState(() => getOrderById(orderId))
  const [loading, setLoading] = useState(!order)
  const [error, setError] = useState(null)
  const invoiceRef = useRef(null)
  const autoDownloadTriggeredRef = useRef(false)

  useEffect(() => {
    if (order) return

    const fetchOrder = async () => {
      try {
        setLoading(true)
        const response = await orderAPI.getOrderDetails(orderId)
        if (response.data?.success && response.data.data?.order) {
          setOrder(response.data.data.order)
        } else {
          setError("Order not found")
        }
      } catch (err) {
        setError("Failed to load invoice details")
      } finally {
        setLoading(false)
      }
    }

    fetchOrder()
  }, [orderId, order])

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const handlePrint = () => {
    const printWindow = window.open('', '_blank')
    const printContent = invoiceRef.current.innerHTML

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice - ${order.id}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .no-print { display: none !important; }
            }
            body { font-family: Arial, sans-serif; background-color: white; }
          </style>
        </head>
        <body class="p-8">
          ${printContent}
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
    }, 1000)
  }

  const handleDownloadPDF = async () => {
    try {
      const doc = new jsPDF()
      const primaryColor = [220, 38, 38]
      const secondaryColor = [71, 85, 105]
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()

      doc.setDrawColor(226, 232, 240)
      doc.setLineWidth(1)
      doc.rect(5, 5, pageWidth - 10, pageHeight - 10)

      doc.setFontSize(22)
      doc.setTextColor(...primaryColor)
      doc.setFont("helvetica", "bold")
      doc.text("INVOICE", 105, 25, { align: "center" })

      doc.setTextColor(15, 23, 42)
      doc.setFontSize(11)
      doc.text(companyName, 14, 45)
      doc.setFont("helvetica", "normal")
      doc.setFontSize(9)
      doc.setTextColor(...secondaryColor)
      doc.text(`FSSAI: ${rest.fssaiNumber || "N/A"}`, 14, 66)
      doc.text(`GSTIN: ${rest.gstNumber || "N/A"}`, 14, 71)

      doc.setTextColor(15, 23, 42)
      doc.setFont("helvetica", "bold")
      doc.setFontSize(11)
      doc.text(rest.restaurantName || companyName, 110, 45)
      doc.setFont("helvetica", "normal")
      doc.setFontSize(9)
      doc.setTextColor(...secondaryColor)
      const sellerAddress = [rest.addressLine1, rest.addressLine2, [rest.city, rest.state, rest.pincode].filter(Boolean).join(" ")].filter(Boolean).join(", ") || "Address not available"
      doc.text(doc.splitTextToSize(sellerAddress, 85), 110, 50)
      doc.text(`FSSAI: ${rest.fssaiNumber || "N/A"}`, 110, 66)
      doc.text(`GSTIN: ${rest.gstNumber || "N/A"}`, 110, 71)

      doc.setDrawColor(226, 232, 240)
      doc.setLineWidth(0.5)
      doc.line(14, 78, 196, 78)

      doc.setTextColor(15, 23, 42)
      doc.setFont("helvetica", "bold")
      doc.text(`Order ID: ${order.id || orderId}`, 14, 88)
      doc.setFont("helvetica", "normal")
      doc.setTextColor(...secondaryColor)
      doc.text(`Date: ${formatDate(order.createdAt)}`, 14, 93)
      doc.text(`Payment: ${order.paymentMethod?.type?.toUpperCase() || "CASH"}`, 14, 98)

      doc.setTextColor(15, 23, 42)
      doc.setFont("helvetica", "bold")
      doc.text("Billed To:", 110, 88)
      doc.setFont("helvetica", "normal")
      doc.text(order.user?.name || "Customer", 110, 93)
      doc.setTextColor(...secondaryColor)
      const customerAddress = [custAddress.street || custAddress.addressLine1, custAddress.additionalDetails || custAddress.addressLine2, [custAddress.city, custAddress.state, custAddress.zipCode].filter(Boolean).join(" ")].filter(Boolean).join(", ") || "Address not available"
      doc.text(doc.splitTextToSize(customerAddress, 85), 110, 98)

      const tableRows = order.items.map((item, index) => {
        const itemQuantity = Number(item.quantity || 0)
        const itemPrice = Number(item.price || 0)
        return [
          index + 1,
          item.variantName ? `${item.name || "Item"} (${item.variantName})` : (item.name || "Item"),
          String(itemQuantity),
          `Rs. ${itemPrice.toFixed(2)}` ,
          `Rs. ${(itemPrice * itemQuantity).toFixed(2)}` ,
        ]
      })

      const autoTable = (await import("jspdf-autotable")).default
      autoTable(doc, {
        startY: 108,
        margin: { left: 14, right: 14 },
        head: [["S.No", "Item Description", "Qty", "Unit Price", "Total Price"]],
        body: tableRows,
        theme: "striped",
        headStyles: {
          fillColor: primaryColor,
          textColor: 255,
          fontStyle: "bold",
        },
        styles: { fontSize: 9, cellPadding: 4 },
        columnStyles: {
          0: { cellWidth: 15, halign: "center" },
          2: { cellWidth: 15, halign: "center" },
          3: { cellWidth: 35, halign: "right" },
          4: { cellWidth: 35, halign: "right" },
        },
      })

      let yPos = (doc.lastAutoTable?.finalY || 150) + 10
      const rightX = 196
      doc.setFont("helvetica", "normal")
      doc.setTextColor(...secondaryColor)
      doc.text("Item Total:", 140, yPos)
      doc.text(`Rs. ${subtotalAmount.toFixed(2)}`, rightX, yPos, { align: "right" })
      yPos += 6

      if (taxAmount > 0) {
        doc.text("GST (gov. taxes):", 140, yPos)
        doc.text(`Rs. ${taxAmount.toFixed(2)}`, rightX, yPos, { align: "right" })
        yPos += 6
      }

      if (deliveryFeeAmount > 0) {
        doc.text("Delivery Charges:", 140, yPos)
        doc.text(`Rs. ${deliveryFeeAmount.toFixed(2)}`, rightX, yPos, { align: "right" })
        yPos += 6
      }

      if (platformFeeAmount > 0) {
        doc.text("Platform Fee:", 140, yPos)
        doc.text(`Rs. ${platformFeeAmount.toFixed(2)}`, rightX, yPos, { align: "right" })
        yPos += 6
      }

      if (discountAmount > 0) {
        doc.text("Discount:", 140, yPos)
        doc.text(`- Rs. ${discountAmount.toFixed(2)}`, rightX, yPos, { align: "right" })
        yPos += 6
      }

      yPos += 2
      doc.setFont("helvetica", "bold")
      doc.setFontSize(11)
      doc.setTextColor(15, 23, 42)
      doc.text("Grand Total:", 140, yPos)
      doc.text(`Rs. ${totalAmount.toFixed(2)}`, rightX, yPos, { align: "right" })

      doc.setFontSize(8)
      doc.setFont("helvetica", "italic")
      doc.setTextColor(148, 163, 184)
      doc.text("This is a computer generated invoice and does not require a physical signature.", 105, pageHeight - 15, { align: "center" })

      const pdfBlob = doc.output("blob")
      await downloadFile({
        data: pdfBlob,
        filename: `Invoice_${order.id || orderId}.pdf`,
        type: "application/pdf",
        successMessage: "Invoice downloaded successfully!",
        preferNativeShare: false,
      })
    } catch (error) {
      console.error("PDF generation error:", error)
      toast.error("Failed to download invoice. Please try again.")
    }
  }

  useEffect(() => {
    if (loading || error || !order || autoDownloadTriggeredRef.current) return
    if (searchParams.get("download") !== "1") return

    autoDownloadTriggeredRef.current = true
    handleDownloadPDF()
  }, [loading, error, order, searchParams])

  if (loading) {
    return (
      <AnimatedPage className="min-h-screen bg-[#f5f5f5] dark:bg-[#0a0a0a] p-4">
        <div className="max-w-4xl mx-auto text-center py-20">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Generating invoice...</p>
        </div>
      </AnimatedPage>
    )
  }

  if (error || !order) {
    return (
      <AnimatedPage className="min-h-screen bg-[#f5f5f5] dark:bg-[#0a0a0a] p-4">
        <div className="max-w-4xl mx-auto text-center py-20">
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold mb-4">{error || 'Order Not Found'}</h1>
          <Link to="/user/orders">
            <Button>Back to Orders</Button>
          </Link>
        </div>
      </AnimatedPage>
    )
  }
  const rest = order.restaurant || {};
  const custAddress = order.address || {};
  const subtotalAmount = Number(order.subtotal ?? order.pricing?.subtotal ?? order.pricing?.total ?? 0)
  const deliveryFeeAmount = Number(order.deliveryFee ?? order.pricing?.deliveryFee ?? 0)
  const platformFeeAmount = Number(order.platformFee ?? order.pricing?.platformFee ?? 0)
  const taxAmount = Number(order.tax ?? order.pricing?.tax ?? 0)
  const discountAmount = Number(order.discount ?? order.pricing?.discount ?? 0)
  const totalAmount = Number(order.total ?? order.pricing?.total ?? subtotalAmount + deliveryFeeAmount + platformFeeAmount + taxAmount - discountAmount)
  const totalRounded = Math.round(totalAmount)

  return (
    <AnimatedPage className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] p-3 sm:p-4">
      <div className="max-w-[800px] mx-auto space-y-4 sm:space-y-6">
        <ScrollReveal>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between no-print">
            <div className="flex items-center gap-3 sm:gap-4">
              <Link to={`/user/orders/${orderId}/details`}>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <h1 className="text-lg sm:text-xl font-bold">Invoice Details</h1>
            </div>
            <div className="flex w-full gap-2 sm:w-auto">
              <Button variant="outline" onClick={handlePrint} className="hidden sm:inline-flex gap-2">
                <Printer className="h-4 w-4" />
                <span className="hidden sm:inline">Print</span>
              </Button>
              <Button onClick={handleDownloadPDF} className="w-full sm:w-auto bg-primary hover:bg-secondary gap-2 text-white">
                <Download className="h-4 w-4" />
                <span>Download</span>
              </Button>
            </div>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <div className="bg-white text-black p-4 sm:p-8 shadow-sm border mx-auto font-sans rounded-2xl sm:rounded-none overflow-hidden" ref={invoiceRef} style={{ width: '100%', maxWidth: '800px' }}>
            
            {/* Header section */}
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-start pb-4 mb-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[#dc2626] flex flex-col items-center justify-center text-white p-2 border-2 border-red-700 mx-auto sm:mx-0">
                  <div className="bg-white rounded-full p-1 mb-1">
                    <span className="text-2xl">👩‍🍳</span>
                  </div>
                  <span className="text-[10px] font-bold tracking-wider text-center leading-tight">{companyName.toUpperCase()}</span>
                </div>
              </div>
              <div className="text-left sm:text-right">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-800 uppercase tracking-wide">Tax Invoice</h1>
                <div className="mt-2 text-xs text-gray-500 uppercase font-medium">Invoice Number</div>
                <div className="font-bold text-gray-800">{order.id}</div>
              </div>
            </div>

            {/* Seller and Buyer Information */}
            <div className="flex flex-col sm:flex-row border border-gray-300 mb-5 sm:mb-6 text-sm rounded-xl sm:rounded-none overflow-hidden">
              <div className="w-full sm:w-1/2 p-4 border-b sm:border-b-0 sm:border-r border-gray-300">
                <div className="text-xs text-gray-500 uppercase mb-2 font-semibold tracking-wider">Sold By / Seller</div>
                <div className="font-bold text-gray-800 uppercase text-base">{rest.restaurantName || companyName}</div>
                <div className="text-gray-600 mt-1 mb-4 leading-snug">
                  {rest.addressLine1 || "Shop No. 38 First Floor"}<br/>
                  {rest.addressLine2 || "V S Place Bodla Agra"}<br/>
                  {rest.city} {rest.state} {rest.pincode}
                </div>
                
                <div className="grid grid-cols-[92px_minmax(0,1fr)] gap-x-2 gap-y-1 mt-2 text-xs break-words">
                  <div className="text-gray-500 font-medium">GSTIN</div>
                  <div className="font-bold">: {rest.gstNumber || "N/A"}</div>
                  
                  <div className="text-gray-500 font-medium">FSSAI License</div>
                  <div className="font-bold">: {rest.fssaiNumber || "N/A"}</div>
                  
                  <div className="text-gray-500 font-medium">PAN</div>
                  <div className="font-bold">: {rest.panNumber || "N/A"}</div>
                </div>
              </div>
              <div className="w-full sm:w-1/2 p-4">
                <div className="text-xs text-gray-500 uppercase mb-2 font-semibold tracking-wider">Invoice To</div>
                <div className="font-bold text-gray-800 text-base">{order.user?.name || "Customer"}</div>
                <div className="text-gray-600 mt-1 mb-4 leading-snug">
                  {custAddress.street || "Corporate House, 103, Film Colony Rd"}, {custAddress.additionalDetails || ""}<br/>
                  {custAddress.city || "Indore"}, {custAddress.state || "Madhya Pradesh"} {custAddress.zipCode || "452001"}
                </div>

                <div className="grid grid-cols-[88px_12px_minmax(0,1fr)] sm:grid-cols-[100px_auto_1fr] gap-x-2 gap-y-1 mt-4 pt-4 border-t border-gray-200 text-xs break-words">
                  <div className="text-gray-500 font-medium">Order ID</div>
                  <div className="font-bold">:</div>
                  <div className="font-bold">{order.id}</div>

                  <div className="text-gray-500 font-medium">Invoice Date</div>
                  <div className="font-bold">:</div>
                  <div className="font-bold">{formatDate(order.createdAt)}</div>

                  <div className="text-gray-500 font-medium">Payment</div>
                  <div className="font-bold">:</div>
                  <div className="font-bold">{order.paymentMethod?.type?.toUpperCase() || "CASH"}</div>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="border border-gray-300 mb-5 sm:mb-6 rounded-xl sm:rounded-none overflow-hidden">
              <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-xs sm:text-sm text-left">
                <thead className="bg-gray-100 border-b border-gray-400 text-gray-800">
                  <tr>
                    <th className="px-3 py-2 border-r border-gray-400 font-bold w-12 text-center text-xs uppercase tracking-wider">Sr. No</th>
                    <th className="px-3 py-2 border-r border-gray-400 font-bold text-xs uppercase tracking-wider">Item Description</th>
                    <th className="px-3 py-2 border-r border-gray-400 font-bold text-center w-16 text-xs uppercase tracking-wider">Qty</th>
                    <th className="px-3 py-2 border-r border-gray-400 font-bold text-right w-24 text-xs uppercase tracking-wider">Unit Price</th>
                    <th className="px-3 py-2 font-bold text-right w-24 text-xs uppercase tracking-wider">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item, index) => {
                    const itemPrice = Number(item.price || 0)
                    const itemQuantity = Number(item.quantity || 0)

                    return (
                      <tr key={item.id || item._id || index} className="border-b border-gray-300 last:border-b-0">
                        <td className="px-3 py-2 border-r border-gray-400 text-center text-gray-800">{index + 1}</td>
                        <td className="px-3 py-2 border-r border-gray-400 font-medium text-gray-900">
                          {item.name} {item.variantName ? `(${item.variantName})` : ""}
                        </td>
                        <td className="px-3 py-2 border-r border-gray-400 text-center font-bold text-gray-800">{itemQuantity}</td>
                        <td className="px-3 py-2 border-r border-gray-400 text-right text-gray-800">{"\u20B9"}{itemPrice.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right font-bold text-gray-900">{"\u20B9"}{(itemPrice * itemQuantity).toFixed(2)}</td>
                      </tr>
                    )
                  })}
                  
                  {/* Totals */}
                  <tr className="border-t-2 border-gray-400 bg-gray-50">
                    <td colSpan="2" className="px-3 py-2 border-r border-gray-400 font-bold text-right text-gray-800 uppercase text-xs">Total</td>
                    <td className="px-3 py-2 border-r border-gray-400 text-center font-bold text-gray-800">
                      {order.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)}
                    </td>
                    <td className="px-3 py-2 border-r border-gray-400"></td>
                    <td className="px-3 py-2 font-bold text-right text-gray-900">{"\u20B9"}{subtotalAmount.toFixed(2)}</td>
                  </tr>
                  {deliveryFeeAmount > 0 && (
                    <tr className="border-t border-gray-300">
                      <td colSpan="4" className="px-3 py-2 border-r border-gray-400 font-bold text-right text-gray-800 uppercase text-[10px] tracking-wider">Delivery Charges</td>
                      <td className="px-3 py-2 text-right font-medium">{"\u20B9"}{deliveryFeeAmount.toFixed(2)}</td>
                    </tr>
                  )}
                  {platformFeeAmount > 0 && (
                    <tr className="border-t border-gray-300">
                      <td colSpan="4" className="px-3 py-2 border-r border-gray-400 font-bold text-right text-gray-800 uppercase text-[10px] tracking-wider">Platform Fee</td>
                      <td className="px-3 py-2 text-right font-medium">{"\u20B9"}{platformFeeAmount.toFixed(2)}</td>
                    </tr>
                  )}
                  {taxAmount > 0 && (
                    <tr className="border-t border-gray-300">
                      <td colSpan="4" className="px-3 py-2 border-r border-gray-400 font-bold text-right text-gray-800 uppercase text-[10px] tracking-wider">GST (Gov. Taxes)</td>
                      <td className="px-3 py-2 text-right font-medium">{"\u20B9"}{taxAmount.toFixed(2)}</td>
                    </tr>
                  )}
                  {discountAmount > 0 && (
                    <tr className="border-t border-gray-300">
                      <td colSpan="4" className="px-3 py-2 border-r border-gray-400 font-bold text-right text-gray-800 uppercase text-[10px] tracking-wider">Discount</td>
                      <td className="px-3 py-2 text-right text-green-700 font-bold">-{"\u20B9"}{discountAmount.toFixed(2)}</td>
                    </tr>
                  )}
                  <tr className="border-t-2 border-gray-400 bg-gray-100">
                    <td colSpan="4" className="px-3 py-3 border-r border-gray-400 font-extrabold text-right text-sm uppercase tracking-wide">Grand Total</td>
                    <td className="px-3 py-3 font-extrabold text-right text-base text-gray-900">{"\u20B9"}{totalAmount.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table></div>
            </div>

            {/* Amount in Words */}
            <div className="border border-gray-300 p-3 mb-5 sm:mb-6 bg-gray-50 flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 rounded-xl sm:rounded-none">
              <span className="text-gray-500 uppercase text-[11px] sm:text-xs font-semibold tracking-wider">Amount In Words:</span>
              <span className="font-bold text-gray-900">{numberToWords(totalRounded)}</span>
            </div>

            {/* Footer / T&C / Signature */}
            <div className="flex flex-col sm:flex-row border border-gray-300 text-[10px] rounded-xl sm:rounded-none overflow-hidden">
              <div className="w-full sm:w-2/3 p-4 border-b sm:border-b-0 sm:border-r border-gray-300">
                <div className="font-bold mb-2 uppercase text-gray-800 tracking-wider">Terms & Conditions:</div>
                <ol className="list-decimal pl-4 space-y-1.5 text-gray-600">
                  <li>If you have any issues or queries in respect of your order, please contact customer chat support through the platform.</li>
                  <li>In case you need to get more information about the seller's FSSAI status, please visit foscos.fssai.gov.in.</li>
                  <li>Please note that we never ask for bank account details such as CVV, account number, UPI Pin, etc. across our support channels.</li>
                </ol>
              </div>
              <div className="w-full sm:w-1/3 flex flex-col">
                <div className="flex-1 p-4 border-b border-gray-300 flex items-center justify-center bg-gray-50/50 min-h-[96px]">
                  {/* Signature area */}
                  <div className="font-serif text-xl text-gray-500 italic -rotate-12 opacity-80 mt-4">{companyName}</div>
                </div>
                <div className="py-2 bg-white text-center font-bold text-gray-800 uppercase tracking-widest text-[10px]">
                  Authorised Signatory
                </div>
              </div>
            </div>

          </div>
        </ScrollReveal>
      </div>
    </AnimatedPage>
  )
}












