'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!
);

export default function LoanManagement() {
  const [loans, setLoans] = useState<any[]>([]);
  const [installments, setInstallments] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState({
    loans: true,
    installments: true
  });
  const [error, setError] = useState<string | null>(null);

  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isPaymentSubmitted, setIsPaymentSubmitted] = useState(false);

  const [paymentData, setPaymentData] = useState({
    jumlah_angsuran: 0,
    custom_payment: false,
    pay_remaining: false // Add this new state
  });

  useEffect(() => {
    // Initial data fetch when component mounts
    fetchAllData();
  }, []); // Runs only once on component mount


  const fetchAllData = useCallback(async () => {
    try {
      await Promise.all([fetchLoans(), fetchInstallments(), fetchMembers()]);
    } catch (error) {
      setError(error.message);
    }
  }, []);

  const fetchLoans = async () => {
    setLoading(prev => ({ ...prev, loans: true }));
    const { data, error } = await supabase
      .from('pinjaman')
      .select(`
        *,
        biodata_anggota: id_anggota (nama_lengkap)
      `)
      .order('created_at', { ascending: false });

    if (!error) {
      setLoans(data);
    }
    setLoading(prev => ({ ...prev, loans: false }));
  };

  const fetchInstallments = async () => {
    setLoading(prev => ({ ...prev, installments: true }));
    const { data, error } = await supabase
      .from('angsuran')
      .select(`*,
                biodata_anggota: id_anggota (nama_lengkap)
      `)
      .order('create_at', { ascending: false });

    if (!error) {
      setInstallments(data);
    }
    setLoading(prev => ({ ...prev, installments: false }));
  };

  const fetchMembers = async () => {
    const { data, error } = await supabase
      .from('biodata_anggota')
      .select('id_anggota, nama_lengkap');

    if (!error) {
      setMembers(data);
    }
  };

  const handleApproveLoan = async () => {
    if (!selectedLoan) return;

    const { error } = await supabase
      .from('pinjaman')
      .update({
        status_pinjaman: 'approved',
        update_at: new Date().toISOString()
      })
      .eq('id', selectedLoan.id);

    if (!error) {
      setIsApproveModalOpen(false);
      await fetchLoans();
    }
  };

  const handleRejectLoan = async () => {
    if (!selectedLoan) return;

    const { error } = await supabase
      .from('pinjaman')
      .update({
        status_pinjaman: 'rejected',
        update_at: new Date().toISOString()
      })
      .eq('id', selectedLoan.id);

    if (!error) {
      setIsRejectModalOpen(false);
      await fetchLoans();
    }
  };

  const handlePaymentSubmit = async () => {
    try {
      if (!selectedLoan) return;

      const recommendedPayment = calculateRecommendedPayment(selectedLoan);
      const remaining = selectedLoan.total_pinjaman - (selectedLoan.total_dibayar || 0);
      const { custom_payment, jumlah_angsuran } = paymentData;

      if (!custom_payment && jumlah_angsuran < recommendedPayment) {
        alert("Remaining amount is smaller than recommended. Please use custom payment.");
        return;
      }

      if (jumlah_angsuran <= 0 || jumlah_angsuran > remaining) {
        alert("Invalid payment amount.");
        return;
      }

      let angsuranKeToInsert = selectedLoan.angsuran_ke; // Default to current value
      let shouldUpdateAngsuranKe = false;

      if (!custom_payment && jumlah_angsuran >= recommendedPayment) {
        // Get the latest angsuran_ke
        const { data: lastAngsuran, error: fetchAngsuranError } = await supabase
          .from("angsuran")
          .select("angsuran_ke")
          .eq("id_pinjaman", selectedLoan.id)
          .order("angsuran_ke", { ascending: false })
          .limit(1);

        if (fetchAngsuranError) {
          alert("Failed to get angsuran data.");
          console.error(fetchAngsuranError);
          return;
        }

        const lastAngsuranKe = lastAngsuran?.[0]?.angsuran_ke || 0;
        angsuranKeToInsert = lastAngsuranKe + 1;
        shouldUpdateAngsuranKe = true;

        if (angsuranKeToInsert > selectedLoan.durasi_pinjaman) {
          alert("All installments have been paid.");
          return;
        }
      }

      const { error: insertError } = await supabase.from("angsuran").insert([
        {
          id_anggota: selectedLoan.id_anggota,
          id_pinjaman: selectedLoan.id,
          angsuran_ke: angsuranKeToInsert,
          jumlah_angsuran,
        },
      ]);

      if (insertError) {
        alert("Failed to record payment.");
        console.error(insertError);
        return;
      }

      const newTotalDibayar = (selectedLoan.total_dibayar || 0) + jumlah_angsuran;
      const newRemaining = selectedLoan.total_pinjaman - newTotalDibayar;

      const updates: any = {
        total_dibayar: newTotalDibayar,
        update_at: new Date().toISOString(),
      };

      if (shouldUpdateAngsuranKe) {
        updates.angsuran_ke = angsuranKeToInsert;
        updates.sisa_angsuran = selectedLoan.durasi_pinjaman - angsuranKeToInsert;
      }

      if (newRemaining <= 0) {
        updates.status_pinjaman = "completed";
      }

      const { error: updateError } = await supabase
        .from("pinjaman")
        .update(updates)
        .eq("id", selectedLoan.id);

      if (updateError) {
        alert("Failed to update loan data.");
        console.error(updateError);
        return;
      }

      alert("Payment recorded!");
      setIsPaymentSubmitted(true);
      setIsPaymentModalOpen(false);
      setPaymentData({ custom_payment: false, jumlah_angsuran: 0 });
    } catch (error) {
      console.error("Error during payment submission:", error);
      alert("An error occurred while processing the payment.");
    }
  };




  const filteredLoans = loans.filter((loan) => {
    const id = loan.id_anggota?.toLowerCase() || '';
    const name = loan.biodata_anggota?.nama_lengkap?.toLowerCase() || '';
    const amount = loan.jumlah_pinjaman?.toString() || '';
    const status = loan.status_pinjaman?.toLowerCase() || '';
    const keyword = searchTerm.toLowerCase();

    return (
      id.includes(keyword) ||
      name.includes(keyword) ||
      amount.includes(keyword) ||
      status.includes(keyword)
    );
  });

  const filteredAngsuran = installments.filter((item) => {
    const idAnggota = item.id_anggota?.toLowerCase() || '';
    const nama = item.biodata_anggota?.nama_lengkap?.toLowerCase() || '';
    const idPinjaman = item.id_pinjaman?.toString() || '';
    const angsuranKe = item.angsuran_ke?.toString() || '';
    const jumlah = item.jumlah_angsuran?.toString() || '';
    const keyword = searchTerm.toLowerCase();

    return (
      idAnggota.includes(keyword) ||
      nama.includes(keyword) ||
      idPinjaman.includes(keyword) ||
      angsuranKe.includes(keyword) ||
      jumlah.includes(keyword)
    );
  });


  const calculateRecommendedPayment = (loan: any) => {
    const total = loan.total_pinjaman;
    const duration = loan.durasi_pinjaman;
    return Math.ceil(total / duration);
  };


  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Pinjaman</h2>
      </div>

      <Tabs defaultValue="loans">
        <TabsList className="border-b">
          <TabsTrigger value="loans">Pinjaman</TabsTrigger>
          <TabsTrigger value="installments">Riwayat Angsuran</TabsTrigger>
        </TabsList>
        <TabsContent value="loans">
          <div className="flex items-center space-x-2 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari Pinjaman..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                fetchLoans();
                setSearchTerm('');
              }}
            >
              Refresh Tabel
            </Button>

          </div>


          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID Pinjaman</TableHead>
                  <TableHead>Member</TableHead>
                  <TableHead>Loan Amount</TableHead>
                  <TableHead>Total Amount</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Installment</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading.loans ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center">Loading pinjaman...</TableCell>
                  </TableRow>
                ) : filteredLoans.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center">Request pinjaman tidak ditemukan..</TableCell>
                  </TableRow>
                ) : (
                  filteredLoans.map((loan) => (
                    <TableRow key={loan.id}>
                      <TableCell>{loan.id}</TableCell>
                      <TableCell>
                        {loan.id_anggota} - {loan.biodata_anggota?.nama_lengkap || 'No Name'}
                      </TableCell>
                      <TableCell>Rp {Number(loan.jumlah_pinjaman).toLocaleString('id-ID')}</TableCell>
                      <TableCell>Rp {Number(loan.total_pinjaman).toLocaleString('id-ID')}</TableCell>
                      <TableCell>{loan.durasi_pinjaman} months</TableCell>
                      <TableCell>
                        <Badge variant={
                          loan.status_pinjaman === 'approved' ? 'default' :
                            loan.status_pinjaman === 'pending' ? 'secondary' :
                              loan.status_pinjaman === 'rejected' ? 'destructive' : 'outline'
                        }>
                          {loan.status_pinjaman}
                        </Badge>
                      </TableCell>
                      <TableCell>Rp {Number(loan.total_dibayar || 0).toLocaleString('id-ID')}</TableCell>
                      <TableCell>{loan.angsuran_ke}/{loan.durasi_pinjaman}</TableCell>
                      <TableCell className="text-right space-x-2">
                        {loan.status_pinjaman === 'pending' && (
                          <>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => {
                                setSelectedLoan(loan);
                                setIsApproveModalOpen(true);
                              }}
                            >
                              Approve
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                setSelectedLoan(loan);
                                setIsRejectModalOpen(true);
                              }}
                            >
                              Reject
                            </Button>
                          </>
                        )}
                        {loan.status_pinjaman === 'approved' && loan.sisa_angsuran > 0 && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setSelectedLoan(loan);
                              setPaymentData({
                                jumlah_angsuran: calculateRecommendedPayment(loan),
                                custom_payment: false
                              });
                              setIsPaymentModalOpen(true);
                            }}
                          >
                            Pay
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
        <TabsContent value="installments">
          <div className="flex items-center space-x-2 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari Angsuran..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                fetchInstallments();
                setSearchTerm('');
              }}
            >
              Refresh Tabel
            </Button>

          </div>


          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID Angsuran</TableHead>
                  <TableHead>ID Pinjaman</TableHead>
                  <TableHead>Nama Anggota</TableHead>
                  <TableHead>Angsuran ke</TableHead>
                  <TableHead>Jumlah Angsuran</TableHead>
                  <TableHead>Created at</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading.installments ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center">Loading pinjaman...</TableCell>
                  </TableRow>
                ) : filteredAngsuran.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center">Request pinjaman tidak ditemukan..</TableCell>
                  </TableRow>
                ) : (
                  filteredAngsuran.map((installments) => (
                    <TableRow key={installments.idAnggota}>
                      <TableCell>{installments.id}</TableCell>
                      <TableCell>{installments.id_pinjaman}</TableCell>
                      <TableCell>
                        {installments.id_anggota} - {installments.biodata_anggota?.nama_lengkap || 'No Name'}
                      </TableCell>
                      <TableCell>{installments.angsuran_ke}</TableCell>
                      <TableCell>Rp {Number(installments.jumlah_angsuran).toLocaleString('id-ID')}</TableCell>
                      <TableCell>{new Date(installments.create_at).toLocaleDateString('id-ID')}</TableCell>

                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>


      <Dialog open={isApproveModalOpen} onOpenChange={setIsApproveModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve request pinjaman</DialogTitle>
            <DialogDescription>
              apakah anda yakin ingin menyetujui permohonan pinjaman ini?
            </DialogDescription>
          </DialogHeader>
          {selectedLoan && (
            <div className="space-y-2">
              <p><strong>Member:</strong> {selectedLoan.id_anggota} - {selectedLoan.biodata_anggota?.nama_lengkap || 'No Name'}</p>
              <p><strong>Amount:</strong> Rp {Number(selectedLoan.jumlah_pinjaman).toLocaleString('id-ID')}</p>
              <p><strong>Duration:</strong> {selectedLoan.durasi_pinjaman} months</p>
              <p><strong>Total to Repay:</strong> Rp {Number(selectedLoan.total_pinjaman).toLocaleString('id-ID')}</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsApproveModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleApproveLoan}>
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRejectModalOpen} onOpenChange={setIsRejectModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Loan Request</DialogTitle>
            <DialogDescription>
              Are you sure you want to reject this loan request?
            </DialogDescription>
          </DialogHeader>
          {selectedLoan && (
            <div className="space-y-2">
              <p><strong>Member:</strong> {selectedLoan.id_anggota} - {selectedLoan.biodata_anggota?.nama_lengkap || 'No Name'}</p>
              <p><strong>Amount:</strong> Rp {Number(selectedLoan.jumlah_pinjaman).toLocaleString('id-ID')}</p>
              <p><strong>Reason:</strong> {selectedLoan.deskripsi_pinjaman || 'No description provided'}</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRejectLoan}>
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Make Payment</DialogTitle>
            <DialogDescription>
              Record payment for {selectedLoan?.id_anggota} - {selectedLoan?.biodata_anggota?.nama_lengkap || 'No Name'}
            </DialogDescription>
          </DialogHeader>

          {selectedLoan && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Loan Amount</Label>
                  <p>Rp {Number(selectedLoan.jumlah_pinjaman).toLocaleString('id-ID')}</p>
                </div>
                <div>
                  <Label>Total to Repay</Label>
                  <p>Rp {Number(selectedLoan.total_pinjaman).toLocaleString('id-ID')}</p>
                </div>
                <div>
                  <Label>Installment</Label>
                  <p>{selectedLoan.angsuran_ke + 1} of {selectedLoan.durasi_pinjaman}</p>
                </div>
                <div>
                  <Label>Remaining</Label>
                  <p>Rp {Number(selectedLoan.total_pinjaman - (selectedLoan.total_dibayar || 0)).toLocaleString('id-ID')}</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="custom_payment"
                  checked={paymentData.custom_payment}
                  onChange={(e) => setPaymentData({
                    ...paymentData,
                    custom_payment: e.target.checked,
                    pay_remaining: false,
                    jumlah_angsuran: 0,
                  })}
                />
                <Label htmlFor="custom_payment">Custom payment amount</Label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="pay_remaining"
                  checked={paymentData.pay_remaining}
                  onChange={(e) => {
                    const remaining = selectedLoan.total_pinjaman - (selectedLoan.total_dibayar || 0);
                    setPaymentData({
                      ...paymentData,
                      custom_payment: false,
                      pay_remaining: e.target.checked,
                      jumlah_angsuran: e.target.checked ? remaining : 0,
                    });
                  }}
                />
                <Label htmlFor="pay_remaining">Pay Remaining</Label>
              </div>

              <div>
                <Label htmlFor="jumlah_angsuran">Payment Amount</Label>
                <Input
                  id="jumlah_angsuran"
                  type="number"
                  value={paymentData.jumlah_angsuran}
                  onChange={(e) => setPaymentData({
                    ...paymentData,
                    jumlah_angsuran: Number(e.target.value)
                  })}
                  disabled={!paymentData.custom_payment && !paymentData.pay_remaining}
                />
                {!paymentData.custom_payment && !paymentData.pay_remaining && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Recommended payment: Rp {calculateRecommendedPayment(selectedLoan).toLocaleString('id-ID')}
                  </p>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPaymentModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handlePaymentSubmit}>
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}