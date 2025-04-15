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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!
);


export default function Balances() {
  const [balances, setBalances] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState({
    balances: true,
    transactions: true
  });
  const [error, setError] = useState<string | null>(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [transactionSearchTerm, setTransactionSearchTerm] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState<{
    id: string;
    id_anggota: string;
    biodata_anggota?: { nama_lengkap: string };
    jenis_transaksi: string;
    jumlah_transaksi: number;
    created_at: string;
  } | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [searchParams] = useSearchParams();
  const idAnggota = searchParams.get('id');

  const [formData, setFormData] = useState({
    id_anggota: '',
    jenis_transaksi: '',
    jumlah_transaksi: '',
  });

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = useCallback(async () => {
    try {
      await Promise.all([fetchBalances(), fetchTransactions(), fetchMembers()]);
    } catch (error) {
      setError(error.message);
    }
  }, []);

  const fetchBalances = async () => {
    setLoading(prev => ({ ...prev, balances: true }));
    const { data, error } = await supabase
      .from('saldo_anggota')
      .select(`
        id_anggota,
        simpanan_pokok,
        simpanan_wajib,
        total_simpanan,
        updated_at,
        biodata_anggota(nama_lengkap)
      `)
      .order('updated_at', { ascending: false });

    if (!error) {
      setBalances(data);
    }
    setLoading(prev => ({ ...prev, balances: false }));
  };

  const fetchTransactions = async () => {
    setLoading(prev => ({ ...prev, transactions: true }));
    let query = supabase
      .from('transaksi_simpanan')
      .select('*, biodata_anggota:id_anggota(nama_lengkap)')
      .order('created_at', { ascending: false });

    if (idAnggota) {
      query = query.eq('id_anggota', idAnggota);
    }

    const { data, error } = await query;

    if (!error) {
      setTransactions(data);
    }
    setLoading(prev => ({ ...prev, transactions: false }));
  };

  const fetchMembers = async () => {
    const { data, error } = await supabase
      .from('biodata_anggota')
      .select('id_anggota, nama_lengkap');

    if (!error) {
      setMembers(data);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAddTransaction = async () => {
    const { error } = await supabase.from('transaksi_simpanan').insert([{
      id_anggota: formData.id_anggota,
      jenis_transaksi: formData.jenis_transaksi,
      jumlah_transaksi: parseFloat(formData.jumlah_transaksi),
      created_at: new Date().toISOString(),
    }]);

    if (!error) {
      setIsAddModalOpen(false);
      await Promise.all([fetchBalances(), fetchTransactions()]);
    }
  };

  const filteredBalances = balances.filter((item) => {
    const id = item.id_anggota?.toLowerCase() || '';
    const name = item.biodata_anggota?.nama_lengkap?.toLowerCase() || '';
    const keyword = searchTerm.toLowerCase();
    return id.includes(keyword) || name.includes(keyword);
  });

  const filteredTransactions = transactions.filter((trx) => {
    const id = trx.id_anggota?.toLowerCase() || '';
    const name = trx.biodata_anggota?.nama_lengkap?.toLowerCase() || '';
    const type = trx.jenis_transaksi?.toLowerCase() || '';
    const amount = trx.jumlah_transaksi?.toString() || '';
    const keyword = transactionSearchTerm.toLowerCase();

    return (
      id.includes(keyword) ||
      name.includes(keyword) ||
      type.includes(keyword) ||
      amount.includes(keyword)
    );
  });


  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Saldo</h2>
        <Button onClick={() => setIsAddModalOpen(true)}>Tambah Transaksi</Button>
      </div>


      <Tabs defaultValue="balances">
        <TabsList>
          <TabsTrigger value="balances">Simpanan</TabsTrigger>
          <TabsTrigger value="transactions">Riwayat Simpanan</TabsTrigger>
        </TabsList>

        <TabsContent value="balances">
          <div className="flex items-center space-x-2 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search members..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                fetchBalances();
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
                  <TableHead>ID Anggota</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>Simpanan Wajib</TableHead>
                  <TableHead>Simpanan Pokok</TableHead>
                  <TableHead>Total Simpanan</TableHead>
                  <TableHead>Terakhir di Update</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading.balances ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">Loading balances...</TableCell>
                  </TableRow>
                ) : filteredBalances.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">No balances found</TableCell>
                  </TableRow>
                ) : (
                  filteredBalances.map((item) => (
                    <TableRow key={item.id_anggota}>
                      <TableCell>{item.id_anggota}</TableCell>
                      <TableCell>{item.biodata_anggota?.nama_lengkap || '-'}</TableCell>
                      <TableCell>Rp {Number(item.simpanan_wajib).toLocaleString('id-ID')}</TableCell>
                      <TableCell>Rp {Number(item.simpanan_pokok).toLocaleString('id-ID')}</TableCell>
                      <TableCell>Rp {Number(item.total_simpanan).toLocaleString('id-ID')}</TableCell>
                      <TableCell>{new Date(item.updated_at).toLocaleDateString('id-ID')}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="transactions">
          <div className="flex items-center space-x-2 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search transactions..."
                className="pl-8"
                value={transactionSearchTerm}
                onChange={(e) => setTransactionSearchTerm(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                fetchTransactions();
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
                  <TableHead>Transaction ID</TableHead>
                  <TableHead>Member ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading.transactions ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">Loading transactions...</TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-red-500">{error}</TableCell>
                  </TableRow>
                ) : filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">
                      {transactionSearchTerm ? "No matching transactions found" : "No transactions found"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions.map((trx) => (
                    <TableRow key={trx.id}>
                      <TableCell>{trx.id}</TableCell>
                      <TableCell>{trx.id_anggota}</TableCell>
                      <TableCell>{trx.biodata_anggota?.nama_lengkap || "No Name"}</TableCell>
                      <TableCell>{trx.jenis_transaksi}</TableCell>
                      <TableCell>Rp {trx.jumlah_transaksi.toLocaleString('id-ID')}</TableCell>
                      <TableCell>{new Date(trx.created_at).toLocaleDateString('id-ID')}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setSelectedTransaction(trx);
                            setIsViewModalOpen(true);
                          }}
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
          </DialogHeader>
          {selectedTransaction && (
            <div className="space-y-4">
              <p><strong>Transaction ID:</strong> {selectedTransaction.id}</p>
              <p><strong>Member:</strong> {selectedTransaction.biodata_anggota?.nama_lengkap || "No Name"}</p>
              <p><strong>Type:</strong> {selectedTransaction.jenis_transaksi}</p>
              <p><strong>Amount:</strong> Rp {selectedTransaction.jumlah_transaksi.toLocaleString('id-ID')}</p>
              <p><strong>Date:</strong> {new Date(selectedTransaction.created_at).toLocaleDateString('id-ID')}</p>
            </div>
          )}
          <Button onClick={() => setIsViewModalOpen(false)} className="w-full">
            Close
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Transaction</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="id_anggota">Member</Label>
              <select
                id="id_anggota"
                name="id_anggota"
                onChange={handleInputChange}
                className="w-full !bg-white !text-black !border-gray-300 !border rounded p-2 focus:!outline-none focus:!ring-2 focus:!ring-blue-500"
                value={formData.id_anggota}
              >
                <option value="">Select Member</option>
                {members.map((member) => (
                  <option key={member.id_anggota} value={member.id_anggota}>
                    {member.id_anggota} - {member.nama_lengkap || "No Name"}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="jenis_transaksi">Transaction Type</Label>
              <select
                id="jenis_transaksi"
                name="jenis_transaksi"
                onChange={handleInputChange}
                className="w-full !bg-white !text-black !border-gray-300 !border rounded p-2 focus:!outline-none focus:!ring-2 focus:!ring-blue-500"
                value={formData.jenis_transaksi}
              >
                <option value="">Select Type</option>
                <option value="wajib">Wajib</option>
                <option value="pokok">Pokok</option>
              </select>
            </div>
            <div>
              <Label htmlFor="jumlah_transaksi">Amount</Label>
              <Input
                id="jumlah_transaksi"
                name="jumlah_transaksi"
                type="number"
                onChange={handleInputChange}
                value={formData.jumlah_transaksi}
              />
            </div>
            <Button onClick={handleAddTransaction} className="w-full">
              Add Transaction
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}